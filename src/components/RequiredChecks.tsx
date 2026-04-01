import { CheckCircle2 } from 'lucide-react'

interface RequiredChecksProps {
  agreedToTerms: boolean
  confirmedRealExperience: boolean
  isNotRelated: boolean
  visitDate: string
  onAgreedToTermsChange: (v: boolean) => void
  onConfirmedRealExperienceChange: (v: boolean) => void
  onIsNotRelatedChange: (v: boolean) => void
  onVisitDateChange: (v: string) => void
  visitDateError: string
}

export function RequiredChecks({
  agreedToTerms,
  confirmedRealExperience,
  isNotRelated,
  visitDate,
  onAgreedToTermsChange,
  onConfirmedRealExperienceChange,
  onIsNotRelatedChange,
  onVisitDateChange,
  visitDateError,
}: RequiredChecksProps) {
  return (
    <div className="border-2 border-orange-300 bg-orange-50 rounded-xl p-5 mb-6 text-left">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="w-5 h-5 text-orange-600" />
        <h2 className="text-lg font-bold text-orange-800">必須確認事項</h2>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => onAgreedToTermsChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-orange-600"
          />
          <span className="text-sm text-gray-800">上記の利用規約を読み、同意します</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmedRealExperience}
            onChange={(e) => onConfirmedRealExperienceChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-orange-600"
          />
          <span className="text-sm text-gray-800">このツールを利用した口コミは、実際の体験に基づいています</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isNotRelated}
            onChange={(e) => onIsNotRelatedChange(e.target.checked)}
            className="mt-1 w-5 h-5 rounded accent-orange-600"
          />
          <span className="text-sm text-gray-800">私は店舗関係者（スタッフ、家族、取引先など）ではありません</span>
        </label>

        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">来店日</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => onVisitDateChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
          />
          {visitDateError && (
            <p className="text-red-600 text-xs mt-1">{visitDateError}</p>
          )}
        </div>
      </div>
    </div>
  )
}
