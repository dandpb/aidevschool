import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';

interface ConfigValue {
  value: unknown;
  contentType: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  reason?: string;
  author?: string;
}

interface CreateConfigRequest {
  value: unknown;
  contentType: string;
  reason?: string;
  author?: string;
  expectedVersion?: number;
}

interface TargetingRule {
  attribute: string;
  operator: string;
  value: unknown;
  treatment: string;
}

interface FlagConfig {
  key: string;
  enabled: boolean;
  defaultTreatment: string;
  treatments: string[];
  targetingRules: TargetingRule[];
  rolloutPercentage: number;
}

interface EvaluationRequest {
  subject: Record<string, unknown>;
  defaultTreatment: string;
}

interface EvaluationResult {
  flagKey: string;
  treatment: string;
  reason: string;
}

class ConfigService {
  private configs = new Map<string, ConfigValue>();
  private history = new Map<string, ConfigValue[]>();
  private flags = new Map<string, FlagConfig>();
  private watchers = new Map<string, ((config: ConfigValue) => void)[]>();

  put(key: string, req: CreateConfigRequest): ConfigValue {
    const existing = this.configs.get(key);
    
    if (req.expectedVersion !== undefined) {
      if (existing && existing.version !== req.expectedVersion) {
        throw new Error('VersionConflict');
      }
    }

    const newVersion = existing ? existing.version + 1 : 1;
    const now = new Date().toISOString();
    
    const config: ConfigValue = {
      value: req.value,
      contentType: req.contentType,
      version: newVersion,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      reason: req.reason,
      author: req.author,
    };

    this.configs.set(key, config);
    
    const history = this.history.get(key) || [];
    history.push(config);
    this.history.set(key, history);

    const watchers = this.watchers.get(key) || [];
    watchers.forEach(cb => cb(config));

    return config;
  }

  get(key: string): ConfigValue | undefined {
    return this.configs.get(key);
  }

  getHistory(key: string): ConfigValue[] {
    return this.history.get(key) || [];
  }

  putFlag(key: string, flag: FlagConfig): void {
    flag.key = key;
    this.flags.set(key, flag);
  }

  getFlag(key: string): FlagConfig | undefined {
    return this.flags.get(key);
  }

  evaluateFlag(key: string, req: EvaluationRequest): EvaluationResult {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error('FlagNotFound');
    }

    if (!flag.enabled) {
      return {
        flagKey: key,
        treatment: flag.defaultTreatment,
        reason: 'flag_disabled',
      };
    }

    for (const rule of flag.targetingRules) {
      const subjectVal = req.subject[rule.attribute];
      if (subjectVal !== undefined) {
        let matches = false;
        
        if (rule.operator === 'equals') {
          matches = JSON.stringify(subjectVal) === JSON.stringify(rule.value);
        } else if (rule.operator === 'contains') {
          if (typeof subjectVal === 'string' && typeof rule.value === 'string') {
            matches = subjectVal.includes(rule.value);
          }
        }

        if (matches) {
          return {
            flagKey: key,
            treatment: rule.treatment,
            reason: 'targeting_rule',
          };
        }
      }
    }

    if (flag.rolloutPercentage < 100) {
      const userId = req.subject.id;
      if (typeof userId === 'string') {
        const hash = crypto.createHash('sha256')
          .update(userId)
          .update(key)
          .digest('hex');
        const hashVal = parseInt(hash.slice(0, 8), 16);
        const percentage = hashVal % 100;
        
        if (percentage >= flag.rolloutPercentage) {
          return {
            flagKey: key,
            treatment: req.defaultTreatment,
            reason: 'rollout',
          };
        }
      }
    }

    return {
      flagKey: key,
      treatment: flag.defaultTreatment,
      reason: 'default',
    };
  }

  watch(key: string, callback: (config: ConfigValue) => void): () => void {
    const watchers = this.watchers.get(key) || [];
    watchers.push(callback);
    this.watchers.set(key, watchers);
    
    return () => {
      const idx = watchers.indexOf(callback);
      if (idx > -1) watchers.splice(idx, 1);
    };
  }
}

function createApp() {
  const app = express();
  const service = new ConfigService();

  app.use(express.json());
  app.use(['/config', '/flags'], requireAuthorization);

  app.put('/config/:key', (req: Request, res: Response) => {
    try {
      const config = service.put(req.params.key, { ...req.body, author: req.body.author ?? principalFrom(req) });
      res.status(201).json(config);
    } catch (err) {
      if ((err as Error).message === 'VersionConflict') {
        res.status(409).json({ error: 'Version conflict' });
      } else {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  });

  app.get('/config/:key', (req: Request, res: Response) => {
    const config = service.get(req.params.key);
    if (!config) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    res.json(config);
  });

  app.get('/config/:key/watch', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const unsubscribe = service.watch(req.params.key, (config) => {
      res.write(`event: config.changed\n`);
      res.write(`data: ${JSON.stringify(config)}\n\n`);
    });

    req.on('close', () => {
      unsubscribe();
    });
  });

  app.put('/flags/:key', (req: Request, res: Response) => {
    service.putFlag(req.params.key, req.body);
    res.status(201).json({ status: 'created' });
  });

  app.get('/flags/:key', (req: Request, res: Response) => {
    const flag = service.getFlag(req.params.key);
    if (!flag) {
      res.status(404).json({ error: 'Flag not found' });
      return;
    }
    res.json(flag);
  });

  app.post('/flags/:key/evaluate', (req: Request, res: Response) => {
    try {
      const result = service.evaluateFlag(req.params.key, req.body);
      res.json(result);
    } catch (err) {
      if ((err as Error).message === 'FlagNotFound') {
        res.status(404).json({ error: 'Flag not found' });
      } else {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  });

  app.get('/__config/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  return { app, service };
}

function requireAuthorization(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.header('authorization');
  if (!authorization?.trim()) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }
  next();
}

function principalFrom(req: Request): string {
  return req.header('authorization') ?? 'authenticated';
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const { app } = createApp();

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Distributed Config Service listening on port ${port}`);
  });
}

export { createApp, ConfigService };
