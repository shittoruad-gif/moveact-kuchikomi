export interface ValidationResult {
  errors: string[]
  warnings: string[]
  isValid: boolean
}

const FORBIDDEN_KEYWORDS = [
  '必ず', '絶対', '確実に', '100%', '完全に',
  '治る', '治ります', '治りました', '病気が治',
  'No.1', 'ナンバーワン', '最高', '最強', '最安',
  '日本一', '世界一', '他より優れ', '他店より',
]

const EXAGGERATION_KEYWORDS = [
  '奇跡', '魔法', '劇的', '革命的', '驚異的',
  'すごすぎ', 'ヤバい', '神',
]

const MEDICAL_CLAIM_KEYWORDS = [
  '痩せる', '痩せます', '痩せました', 'ダイエット効果',
  '脂肪が減', '体重が減', '肌が白く', 'シミが消', 'シワが消',
]

export function validateReviewContent(content: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Forbidden keywords (block)
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (content.includes(keyword)) {
      errors.push(`禁止キーワード「${keyword}」が含まれています。投稿前に削除してください。`)
    }
  }

  // Exaggeration warnings
  for (const keyword of EXAGGERATION_KEYWORDS) {
    if (content.includes(keyword)) {
      warnings.push(`誇大表現「${keyword}」が含まれています。より自然な表現への変更をおすすめします。`)
    }
  }

  // Medical claim warnings
  for (const keyword of MEDICAL_CLAIM_KEYWORDS) {
    if (content.includes(keyword)) {
      warnings.push(`医療効果の断定表現「${keyword}」が含まれています。個人の感想として表現することをおすすめします。`)
    }
  }

  // Length check
  if (content.length < 100) {
    warnings.push(`口コミが短すぎます（${content.length}文字）。推奨は200〜400文字です。`)
  }
  if (content.length > 600) {
    warnings.push(`口コミが長すぎます（${content.length}文字）。推奨は200〜400文字です。`)
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  }
}
