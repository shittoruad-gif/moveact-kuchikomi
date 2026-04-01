import { useState, useCallback } from 'react'
import { trpc } from '../lib/trpc'
import { LineBrowserWarning } from '../components/LineBrowserWarning'
import { TermsOfService } from '../components/TermsOfService'
import { RequiredChecks } from '../components/RequiredChecks'
import { StoreSelector } from '../components/StoreSelector'
import { MenuSelector } from '../components/MenuSelector'
import { TagSelector } from '../components/TagSelector'
import { ReviewResult } from '../components/ReviewResult'
import { ThankYouCard } from '../components/ThankYouCard'
import { ReviewHistory } from '../components/ReviewHistory'
import { Sparkles, Loader2 } from 'lucide-react'

const PURPOSE_OPTIONS = [
  '肩こり・首こり', '腰痛', '頭痛', '姿勢改善',
  '美容・アンチエイジング', 'ダイエット・ボディメイク',
  'スポーツ障害・ケガ', 'ストレス・疲労回復', '産後ケア', 'その他',
]

const SATISFACTION_OPTIONS = ['とても満足', '満足', '普通', '不満', 'とても不満']

const STAFF_IMPRESSION_OPTIONS = [
  '丁寧な説明', '技術が高い', '親切・フレンドリー',
  'プロフェッショナル', '話しやすい', '的確なアドバイス',
]

const ATMOSPHERE_OPTIONS = [
  '清潔感がある', '落ち着いた雰囲気', 'アクセスが良い',
  '駐車場が便利', '待ち時間が少ない', '設備が充実',
]

const VISIT_FREQUENCY_OPTIONS = ['初めて', '数回目', '定期的に通っている', '久しぶり']

function getVisitorId(): string {
  const key = 'moveact-visitor-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function Home() {
  // Required checks
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [confirmedRealExperience, setConfirmedRealExperience] = useState(false)
  const [isNotRelated, setIsNotRelated] = useState(false)
  const [visitDate, setVisitDate] = useState('')
  const [visitDateError, setVisitDateError] = useState('')

  // Selections
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([])
  const [purpose, setPurpose] = useState('')
  const [satisfaction, setSatisfaction] = useState('')
  const [staffImpression, setStaffImpression] = useState<string[]>([])
  const [staffImpressionText, setStaffImpressionText] = useState('')
  const [atmosphereArr, setAtmosphereArr] = useState<string[]>([])
  const [atmosphereText, setAtmosphereText] = useState('')
  const [visitFrequency, setVisitFrequency] = useState('')

  // Results
  const [variations, setVariations] = useState<string[] | null>(null)
  const [showThankYou, setShowThankYou] = useState(false)

  // Data queries
  const storesQuery = trpc.stores.list.useQuery()
  const menusQuery = trpc.menus.list.useQuery()
  const visitorId = getVisitorId()
  const historyQuery = trpc.history.list.useQuery({ visitorId })

  // Mutations
  const generateMutation = trpc.review.generate.useMutation()
  const saveHistoryMutation = trpc.history.save.useMutation()
  const deleteHistoryMutation = trpc.history.delete.useMutation()

  const stores = storesQuery.data || []
  const menus = menusQuery.data || []
  const history = historyQuery.data || []
  const selectedStore = stores.find((s) => s.id === selectedStoreId)

  const validateVisitDate = (date: string) => {
    if (!date) {
      setVisitDateError('')
      return
    }
    const d = new Date(date)
    const now = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    if (d > now) {
      setVisitDateError('未来の日付は入力できません')
    } else if (d < oneYearAgo) {
      setVisitDateError('1年以上前の日付は入力できません')
    } else {
      setVisitDateError('')
    }
  }

  const handleVisitDateChange = (date: string) => {
    setVisitDate(date)
    validateVisitDate(date)
  }

  const handleMenuToggle = (id: number) => {
    setSelectedMenuIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleStaffImpressionToggle = (value: string) => {
    setStaffImpression((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    )
  }

  const handleAtmosphereToggle = (value: string) => {
    setAtmosphereArr((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    )
  }

  const allChecksComplete =
    agreedToTerms && confirmedRealExperience && isNotRelated && visitDate && !visitDateError
  const canGenerate =
    allChecksComplete && selectedStoreId !== null && selectedMenuIds.length > 0

  const handleGenerate = async () => {
    if (!canGenerate || !selectedStore) return

    const selectedMenuNames = menus
      .filter((m) => selectedMenuIds.includes(m.id))
      .map((m) => m.name)

    const result = await generateMutation.mutateAsync({
      storeId: selectedStore.id,
      menuIds: selectedMenuIds,
      storeName: selectedStore.name,
      storeArea: selectedStore.area,
      menuNames: selectedMenuNames,
      purpose,
      satisfaction,
      staffImpression,
      staffImpressionText,
      atmosphere: atmosphereArr,
      atmosphereText,
      visitFrequency,
    })

    setVariations(result.variations)
    setShowThankYou(false)
  }

  const handleGoogleMapsOpen = () => {
    setShowThankYou(true)
    // Save to history
    if (variations && selectedStore) {
      const selectedMenuNames = menus
        .filter((m) => selectedMenuIds.includes(m.id))
        .map((m) => m.name)
      saveHistoryMutation.mutate(
        {
          visitorId,
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          menuNames: selectedMenuNames.join('、'),
          reviewText: variations[0],
          visitDate,
          agreedToTerms: 1,
          confirmedRealExperience: 1,
          isNotRelated: 1,
        },
        { onSuccess: () => historyQuery.refetch() }
      )
    }
  }

  const handleReset = useCallback(() => {
    setSelectedStoreId(null)
    setSelectedMenuIds([])
    setPurpose('')
    setSatisfaction('')
    setStaffImpression([])
    setStaffImpressionText('')
    setAtmosphereArr([])
    setAtmosphereText('')
    setVisitFrequency('')
    setVariations(null)
    setShowThankYou(false)
  }, [])

  const handleLoadFromHistory = (text: string) => {
    setVariations([text, text, text])
    setShowThankYou(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteHistory = (id: number) => {
    deleteHistoryMutation.mutate(
      { id, visitorId },
      { onSuccess: () => historyQuery.refetch() }
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand mb-2">Moveact</h1>
          <p className="text-lg text-gray-600">Google マップ 口コミ生成ツール</p>
          <p className="text-sm text-gray-500 mt-1">
            質問に答えるだけで、AIが自然な口コミ文章を作成します
          </p>
        </div>

        <LineBrowserWarning />
        <TermsOfService />

        <RequiredChecks
          agreedToTerms={agreedToTerms}
          confirmedRealExperience={confirmedRealExperience}
          isNotRelated={isNotRelated}
          visitDate={visitDate}
          onAgreedToTermsChange={setAgreedToTerms}
          onConfirmedRealExperienceChange={setConfirmedRealExperience}
          onIsNotRelatedChange={setIsNotRelated}
          onVisitDateChange={handleVisitDateChange}
          visitDateError={visitDateError}
        />

        {allChecksComplete && (
          <>
            <StoreSelector
              stores={stores}
              selectedStoreId={selectedStoreId}
              onSelect={setSelectedStoreId}
            />

            <MenuSelector
              menus={menus}
              selectedMenuIds={selectedMenuIds}
              onToggle={handleMenuToggle}
            />

            <TagSelector
              step={3}
              title="来店目的"
              options={PURPOSE_OPTIONS}
              selected={purpose}
              onSelect={setPurpose}
            />

            <TagSelector
              step={4}
              title="満足度"
              options={SATISFACTION_OPTIONS}
              selected={satisfaction}
              onSelect={setSatisfaction}
            />

            <TagSelector
              step={5}
              title="施術者の印象（複数選択可）"
              options={STAFF_IMPRESSION_OPTIONS}
              selected={staffImpression}
              onSelect={handleStaffImpressionToggle}
              multiple
              freeText={staffImpressionText}
              onFreeTextChange={setStaffImpressionText}
              freeTextPlaceholder="施術者の印象について自由に記入（任意）"
            />

            <TagSelector
              step={6}
              title="店内の雰囲気（複数選択可）"
              options={ATMOSPHERE_OPTIONS}
              selected={atmosphereArr}
              onSelect={handleAtmosphereToggle}
              multiple
              freeText={atmosphereText}
              onFreeTextChange={setAtmosphereText}
              freeTextPlaceholder="店内の雰囲気について自由に記入（任意）"
            />

            <TagSelector
              step={7}
              title="通院頻度"
              options={VISIT_FREQUENCY_OPTIONS}
              selected={visitFrequency}
              onSelect={setVisitFrequency}
            />

            {/* Generate button */}
            <div className="mb-6">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-brand text-white text-lg font-bold hover:bg-brand-light transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    口コミを生成する
                  </>
                )}
              </button>
            </div>

            {/* Results */}
            {variations && !showThankYou && selectedStore && (
              <ReviewResult
                variations={variations}
                googleMapsUrl={selectedStore.googleMapsUrl}
                onGoogleMapsOpen={handleGoogleMapsOpen}
              />
            )}

            {showThankYou && <ThankYouCard onReset={handleReset} />}
          </>
        )}

        {/* History */}
        <ReviewHistory
          items={history}
          onLoad={handleLoadFromHistory}
          onDelete={handleDeleteHistory}
        />

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-8 pb-4">
          <p>&copy; Moveact - 口コミ生成ツール</p>
        </div>
      </div>
    </div>
  )
}
