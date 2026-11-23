export interface ValidationResult {
  errors: string[]
  warnings: string[]
  isValid: boolean
}

export const FORBIDDEN_KEYWORDS = [
  '必ず', '絶対', '確実に', '100%', '完全に',
  '治る', '治ります', '治りました', '病気が治',
  'No.1', 'ナンバーワン', '最高', '最強', '最安',
  '日本一', '世界一', '他より優れ', '他店より',
]

export const EXAGGERATION_KEYWORDS = [
  '奇跡', '魔法', '劇的', '革命的', '驚異的',
  'すごすぎ', 'ヤバい', '神',
]

export const MEDICAL_CLAIM_KEYWORDS = [
  '痩せる', '痩せます', '痩せました', 'ダイエット効果',
  '脂肪が減', '体重が減', '肌が白く', 'シミが消', 'シワが消',
]

// 作成の段階で使わせない言葉（禁止・誇大・効果の断定をまとめたもの）
export const AVOID_WORDS = [...FORBIDDEN_KEYWORDS, ...EXAGGERATION_KEYWORDS, ...MEDICAL_CLAIM_KEYWORDS]

export function findAvoidWords(content: string): string[] {
  return AVOID_WORDS.filter((w) => content.includes(w))
}

// 書き直しても残ったときの最後の手当て。長い言葉から順に、意味の近い穏やかな言い方へ置き換える
// （「神」は「精神」「神社」なども壊すので置き換えない。画面の注意表示に任せる）
const SOFTER: Record<string, string> = {
  '必ず': 'きっと', '絶対': '本当に', '確実に': 'しっかり', '100%': 'とても', '完全に': 'すっかり',
  '病気が治': '体調が良くな', '治りました': '楽になりました', '治ります': '楽になります', '治る': '楽になる',
  '最高の': '素敵な', '最強の': '頼もしい', '日本一の': '素敵な', '世界一の': '素敵な',
  'No.1': 'お気に入り', 'ナンバーワン': 'お気に入り', '最高': 'とても良い', '最強': 'とても頼もしい', '最安': 'お手頃',
  '日本一': 'とても良い', '世界一': 'とても良い', '他より優れ': '優れ', '他店より': '',
  '奇跡': '嬉しい変化', '魔法': '素敵', '劇的': '大きく', '革命的': '新鮮', '驚異的': 'とても',
  'すごすぎ': 'とても良すぎ', 'ヤバい': 'とても良い',
  '痩せる': 'すっきりする', '痩せます': 'すっきりします', '痩せました': 'すっきりしました', 'ダイエット効果': 'すっきり感',
  '脂肪が減': 'すっきりしてき', '体重が減': '体が軽くなってき', '肌が白く': '肌の調子が良く', 'シミが消': 'シミが気になりにくくな', 'シワが消': 'ハリを感じるようにな',
}

export function softenAvoidWords(content: string): string {
  let out = content
  for (const w of Object.keys(SOFTER).sort((a, b) => b.length - a.length)) out = out.split(w).join(SOFTER[w])
  return out
}

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
