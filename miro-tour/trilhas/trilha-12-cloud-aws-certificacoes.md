# 🛤️ Trilha 12 — Cloud & AWS (Certificações)

> **Fase do board:** F3/F4 — Básico das Cloud Providers + AWS Certified (estágios 25, 38) · **Duração:** 8–12 semanas · **Pré-requisitos:** Trilhas 05, 07

## 🎯 Objetivo

Sair do zero em cloud computing até a certificação **AWS Certified Solutions
Architect — Associate** (recomendação explícita do board no estágio de NFRs),
com caminho de evolução para o nível Professional.

## 📦 Módulos

### M1 — Conceitos de cloud (1 semana)

- ⚠️ [Scalability and Elasticity in Cloud Computing (GeeksforGeeks)](https://www.geeksforgeeks.org/scalability-and-elasticity-in-cloud-computing/)
  — escala vertical × horizontal, elasticidade/auto scaling.
- ✅ [AWS — treinamento para arquitetos](https://aws.amazon.com/pt/training/learn-about/architect/) — portal oficial; criar conta AWS Free Tier.
- Mapear os modelos: IaaS × PaaS × SaaS; regiões e zonas de disponibilidade
  (conceito que volta com força na Trilha 15).

**Checkpoint:** explicar AZ × região e desenhar uma arquitetura 2-AZ no papel.

### M2 — Serviços essenciais na prática (3–4 semanas)

- Prática guiada na conta Free Tier, replicando o e-commerce:
  - **EC2 + Auto Scaling + ELB** — camada de aplicação (Trilha 14 aprofunda).
  - **RDS (PostgreSQL)** — banco gerenciado (Trilha 03).
  - **S3 + CloudFront** — assets e CDN (Trilha 14).
  - **IAM** — usuários, roles, least privilege (conecta Trilha 06).
  - **VPC básico** — subnets públicas/privadas, security groups.

**Checkpoint:** e-commerce rodando em EC2 + RDS com ELB, acesso SSH apenas via
bastion, tudo criado via console **e** reproduzido em IaC (CloudFormation/Terraform).

### M3 — AWS SAA-C03: estudo dirigido (4–6 semanas)

- **Atalho opcional para iniciantes:** [AWS Certified Cloud Practitioner](https://aws.amazon.com/pt/certification/certified-cloud-practitioner/) +
  [Exam Guide CLF (PDF)](https://d1.awsstatic.com/pt_BR/training-and-certification/docs-cloud-practitioner/AWS-Certified-Cloud-Practitioner_Exam-Guide.pdf) — certificação de entrada antes do SAA.
- ✅ [AWS Certified Solutions Architect — Associate (página oficial)](https://aws.amazon.com/pt/certification/certified-solutions-architect-associate/)
- ✅ [Exam Guide SAA (PDF oficial)](https://d1.awsstatic.com/onedam/marketing-channels/website/aws/en_US/certification/approved/pdfs/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Exam-Guide.pdf)
- ✅ [AWS Architecture Blog](https://aws.amazon.com/pt/blogs/architecture/) — ler 1 artigo/semana como reforço contextual.
- Simuladores oficiais (AWS Skill Builder) + práticas de laboratório.

**Checkpoint:** ≥ 75% de acerto consistente em 2 simulados completos.

### M4 — Evolução: Professional (opcional, após 6+ meses de prática)

- ✅ [AWS Certified Solutions Architect — Professional](https://aws.amazon.com/pt/certification/certified-solutions-architect-professional/) ·
  [Exam Guide SAP (PDF)](https://d1.awsstatic.com/pt_BR/training-and-certification/docs-sa-pro/AWS-Certified-Solutions-Architect-Professional_Exam-Guide.pdf)
- Foco: multi-account (Organizations), híbrido, migração, disaster recovery.

## 🛠️ Projeto prático

**E-commerce na AWS**: subir a aplicação das trilhas anteriores em arquitetura
multi-AZ (ELB + ASG + RDS Multi-AZ + S3/CloudFront), com diagrama da arquitetura
e justificativa de cada escolha de serviço.

## 🏁 Critérios de conclusão

- [ ] Arquitetura multi-AZ rodando com IaC commitada no repo.
- [ ] Diagrama da arquitetura com justificativas (por que EC2 e não Lambda? por que RDS?).
- [ ] Simulado SAA com ≥ 75% (evidência: print do resultado).
- [ ] **Meta final:** exame SAA-C03 agendado/concluído.

**Cruza com:** [Trilha 14](./trilha-14-system-design-escalabilidade.md) (load balancing,
auto scaling, CDN na prática) e [Trilha 15](./trilha-15-sistemas-distribuidos-nfrs.md) (HA, failover, multi-AZ).

**Próxima:** [Trilha 13 — Arquitetura de Software & DDD](./trilha-13-arquitetura-software-ddd.md)
