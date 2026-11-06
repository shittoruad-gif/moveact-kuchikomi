import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
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
import { SATISFACTION_OPTIONS, type TenantConfig } from '../../shared/tenantConfig'
import { normalizeSource } from '../../shared/source'

// どこから開いたか（店頭QR／お礼メッセージ）。画面を開いたときのURLで決まる
const SOURCE = normalizeSource(new URLSearchParams(window.location.search).get('via'))

function getVisitorId(): string {
  const key = 'moveact-visitor-id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

// お店ごとの設定を読み込んでから画面を出す（別のお店の名前や色が一瞬見えないように）
export function Home() {
  const configQuery = trpc.tenant.config.useQuery(undefined, { staleTime: Infinity })
  const config = configQuery.data

  useEffect(() => {
    if (!config) return
    document.title = `${config.brandName} 口コミ生成ツール`
    const root = document.documentElement.style
    root.setProperty('--color-brand', config.colors.brand)
    root.setProperty('--color-brand-soft', config.colors.brandSoft)
    root.setProperty('--color-primary', config.colors.primary)
    root.setProperty('--color-primary-light', config.colors.primaryLight)
  }, [config])

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-soft">
        {configQuery.isError ? (
          <p className="text-sm">読み込みに失敗しました。時間をおいて開き直してください。</p>
        ) : (
          <Loader2 className="w-6 h-6 animate-spin" />
        )}
      </div>
    )
  }
  if (config.ended) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="font-serif text-xl font-bold text-ink mb-2">{config.brandName}</p>
          <p className="text-sm text-ink-soft">この口コミ作成アプリは、ご利用を終了しました。</p>
        </div>
      </div>
    )
  }
  return <HomeForm config={config} />
}

function HomeForm({ config }: { config: TenantConfig }) {
  const { words, options } = config
  // Required checks
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [confirmedRealExperience, setConfirmedRealExperience] = useState(false)
  const [isNotRelated, setIsNotRelated] = useState(false)
  const [visitDate, setVisitDate] = useState('')
  const [visitDateError, setVisitDateError] = useState('')

  // Selections
  const [pickedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([])
  const [purpose, setPurpose] = useState<string[]>([])
  // 来店目的の自由入力（選択肢に無い目的を自分の言葉で書ける。三上様要望 2026-08-30）
  const [purposeText, setPurposeText] = useState('')
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
  // 店舗が1つだけのお店は選ばせずに決めておく
  const selectedStoreId = pickedStoreId ?? (stores.length === 1 ? stores[0].id : null)
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

  const handlePurposeToggle = (value: string) => {
    setPurpose((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
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
  // 満足度は生成トーンを決める入力なので必須にする
  const canGenerate =
    allChecksComplete &&
    selectedStoreId !== null &&
    selectedMenuIds.length > 0 &&
    satisfaction !== ''

  const handleGenerate = async () => {
    if (!canGenerate || !selectedStore) return

    try {
      const result = await generateMutation.mutateAsync({
        storeId: selectedStore.id,
        menuIds: selectedMenuIds,
        purpose: [...purpose, purposeText.trim()].filter(Boolean).join('、'),
        satisfaction,
        staffImpression,
        staffImpressionText,
        atmosphere: atmosphereArr,
        atmosphereText,
        visitFrequency,
      })

      setVariations(result.variations)
      setShowThankYou(false)
      toast.success('3つの口コミバリエーションを生成しました！')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : '口コミの生成に失敗しました。もう一度お試しください。',
      )
    }
  }

  const handleGoogleMapsOpen = (postedText: string) => {
    setShowThankYou(true)
    // 実際に投稿画面へ持っていったテキスト（編集後）を履歴に保存する
    if (selectedStore) {
      const selectedMenuNames = menus
        .filter((m) => selectedMenuIds.includes(m.id))
        .map((m) => m.name)
      saveHistoryMutation.mutate(
        {
          visitorId,
          storeId: selectedStore.id,
          storeName: selectedStore.name,
          menuNames: selectedMenuNames.join('、'),
          reviewText: postedText,
          visitDate,
          agreedToTerms: 1,
          confirmedRealExperience: 1,
          isNotRelated: 1,
          source: SOURCE,
        },
        { onSuccess: () => historyQuery.refetch() }
      )
    }
  }

  const handleReset = useCallback(() => {
    setSelectedStoreId(null)
    setSelectedMenuIds([])
    setPurpose([])
    setPurposeText('')
    setSatisfaction('')
    setStaffImpression([])
    setStaffImpressionText('')
    setAtmosphereArr([])
    setAtmosphereText('')
    setVisitFrequency('')
    setVariations(null)
    setShowThankYou(false)
  }, [])

  const handleLoadFromHistory = (item: { storeId: number; reviewText: string }) => {
    // 履歴の店舗を自動選択（店舗未選択のままだと編集画面が表示されないため）
    setSelectedStoreId(item.storeId)
    // 1案だけ渡すと ReviewResult 側で案選択が非表示になる
    setVariations([item.reviewText])
    setShowThankYou(false)
    if (!allChecksComplete) {
      toast.info('必須確認事項にチェックし、来店日を入力すると内容を確認・編集できます')
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteHistory = (id: number) => {
    deleteHistoryMutation.mutate(
      { id, visitorId },
      { onSuccess: () => historyQuery.refetch() }
    )
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
        {config.demo && (
          <div className="mb-6 rounded-md border border-warn bg-warn-soft px-4 py-2 text-sm text-warn text-center">
            デモ版です。実際の画面の流れをお試しいただけます（投稿はできません）。
          </div>
        )}
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-md bg-brand text-white flex items-center justify-center font-serif font-bold text-lg shrink-0">
              {config.logoLetter}
            </div>
            <h1 className="font-serif text-3xl font-bold text-brand tracking-wide">{config.brandName}</h1>
          </div>
          <p className="text-ink text-lg">口コミを書く、その前に。</p>
          <p className="text-sm text-ink-soft mt-1 max-w-md">
            いくつかの質問に答えるだけで、Googleマップに投稿できる口コミの下書きをAIが作成します。
          </p>
          <div className="h-px bg-line mt-6" />
        </div>

        <LineBrowserWarning />
        <TermsOfService serviceWord={words.service} />

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
              serviceWord={words.service}
            />

            <TagSelector
              step={3}
              title="来店目的（複数選択可）"
              options={options.purpose}
              selected={purpose}
              onSelect={handlePurposeToggle}
              multiple
              freeText={purposeText}
              onFreeTextChange={(v) => setPurposeText(v.slice(0, 100))}
              freeTextPlaceholder="ご自身の言葉でも入力できます（例：デスクワークで背中が重くて…）"
            />

            <TagSelector
              step={4}
              title="満足度（必須）"
              options={SATISFACTION_OPTIONS}
              selected={satisfaction}
              onSelect={setSatisfaction}
            />

            <TagSelector
              step={5}
              title={`${words.staff}の印象（複数選択可）`}
              options={options.staff}
              selected={staffImpression}
              onSelect={handleStaffImpressionToggle}
              multiple
              freeText={staffImpressionText}
              onFreeTextChange={setStaffImpressionText}
              freeTextPlaceholder={`${words.staff}の印象について自由に記入（任意）`}
            />

            <TagSelector
              step={6}
              title={`${words.place}の雰囲気（複数選択可）`}
              options={options.atmosphere}
              selected={atmosphereArr}
              onSelect={handleAtmosphereToggle}
              multiple
              freeText={atmosphereText}
              onFreeTextChange={setAtmosphereText}
              freeTextPlaceholder={`${words.place}の雰囲気について自由に記入（任意）`}
            />

            <TagSelector
              step={7}
              title={words.frequency}
              options={options.frequency}
              selected={visitFrequency}
              onSelect={setVisitFrequency}
            />

            {/* Generate button */}
            <div className="mb-6">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generateMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-white text-lg font-bold hover:bg-primary-light transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none shadow-[4px_4px_0_0_var(--color-ink)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
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
                demo={!!config.demo}
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
        <div className="text-xs text-ink-soft mt-10 pb-4">
          <div className="h-px bg-line mb-4" />
          <p>{config.footer}</p>
        </div>
      </div>
    </div>
  )
}
