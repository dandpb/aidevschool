import { parseArgs } from 'node:util'
import {
  SyntaxKind,
  isBinaryExpression,
  isCaseClause,
  isFunctionLikeDeclaration,
  isParameterDeclaration,
  isPropertyAssignment,
  isVariableDeclaration,
} from 'typescript/unstable/ast'
import { API } from 'typescript/unstable/sync'

const BRANCH_KINDS = new Set([
  SyntaxKind.CatchClause,
  SyntaxKind.ConditionalExpression,
  SyntaxKind.DoStatement,
  SyntaxKind.ForInStatement,
  SyntaxKind.ForOfStatement,
  SyntaxKind.ForStatement,
  SyntaxKind.IfStatement,
  SyntaxKind.WhileStatement,
])
const LOGICAL_ASSIGNMENTS = new Set([
  SyntaxKind.AmpersandAmpersandEqualsToken,
  SyntaxKind.BarBarEqualsToken,
  SyntaxKind.QuestionQuestionEqualsToken,
])
const LOGICAL_OPERATORS = new Set([
  SyntaxKind.AmpersandAmpersandToken,
  SyntaxKind.BarBarToken,
  SyntaxKind.QuestionQuestionToken,
])

function parameterHasDefault(node) {
  return isParameterDeclaration(node) && node.initializer !== undefined
}

function isLogicalAssignment(node) {
  return isBinaryExpression(node) && LOGICAL_ASSIGNMENTS.has(node.operatorToken.kind)
}

function isLogicalOperator(node) {
  return isBinaryExpression(node) && LOGICAL_OPERATORS.has(node.operatorToken.kind)
}

function branchIncrement(node) {
  if (BRANCH_KINDS.has(node.kind)) return 1
  if (isCaseClause(node)) return 1
  if (parameterHasDefault(node)) return 1
  if (isLogicalAssignment(node)) return 1
  if (isLogicalOperator(node)) return 1
  if (node.questionDotToken !== undefined) return 1
  return 0
}

function functionComplexity(root) {
  let complexity = 1
  function visit(node) {
    if (node !== root && isFunctionLikeDeclaration(node)) return
    complexity += branchIncrement(node)
    node.forEachChild(visit)
  }
  root.forEachChild(visit)
  return complexity
}

function functionName(node, source, line) {
  if (node.name !== undefined) return node.name.getText(source)
  if (isVariableDeclaration(node.parent)) return node.parent.name.getText(source)
  if (isPropertyAssignment(node.parent)) return node.parent.name.getText(source)
  return `<anonymous@${line}>`
}

function inspectFile(file, source, maximum) {
  const results = []
  function visit(node) {
    if (isFunctionLikeDeclaration(node)) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
      results.push({ file, name: functionName(node, source, line), line, complexity: functionComplexity(node) })
    }
    node.forEachChild(visit)
  }
  visit(source)
  const violations = results.filter((result) => result.complexity > maximum)
  return { results, violations }
}

function main() {
  const { values, positionals } = parseArgs({
    options: { max: { type: 'string', default: '8' } },
    allowPositionals: true,
  })
  const maximum = Number(values.max)
  if (!Number.isInteger(maximum) || maximum < 1 || positionals.length === 0) {
    console.error('usage: node scripts/check-ts-complexity.mjs <files...> --max <positive integer>')
    process.exitCode = 2
    return
  }
  const api = new API()
  const snapshot = api.updateSnapshot({ openFiles: positionals })
  const reports = positionals.map((file) => {
    const project = snapshot.getDefaultProjectForFile(file)
    const source = project?.program.getSourceFile(file)
    if (source === undefined) throw new Error(`TypeScript could not parse ${file}`)
    return inspectFile(file, source, maximum)
  })
  snapshot.dispose()
  api.close()
  const results = reports.flatMap((report) => report.results)
  const violations = reports.flatMap((report) => report.violations)
  for (const result of violations) {
    console.error(`${result.file}:${result.name}:${result.line}: complexity ${result.complexity} exceeds ${maximum}`)
  }
  const maxComplexity = Math.max(0, ...results.map((result) => result.complexity))
  console.log(`functions=${results.length} maxCC=${maxComplexity} limit=${maximum}`)
  if (violations.length > 0) process.exitCode = 1
}

main()
