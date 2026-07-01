import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp } from 'lucide-react'

export function TermsOfService() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-2 border-red-300 bg-red-50 rounded-xl p-5 mb-6 text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold text-red-800">利用規約・注意事項</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-red-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-red-600" />
        )}
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 text-sm text-red-900">
          <div>
            <h3 className="font-bold mb-1">利用規約</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>本ツールは、実際に施術を受けた方のみがご利用いただけます</li>
              <li>虚偽の内容を含む口コミの投稿は禁止されています</li>
              <li>店舗関係者（スタッフ、家族、取引先など）による利用は禁止されています</li>
              <li className="font-bold text-red-600">
                金銭的報酬、割引、無料サービス、ポイント付与などのインセンティブ（特典）と引き換えに、店舗が指示した内容の口コミを投稿することは禁止されています（景品表示法違反）
              </li>
              <li>誇大表現や断定的な効果効能（「必ず痩せる」「病気が治る」など）は含めないでください</li>
              <li>生成された文章はあくまで参考です。ご自身の体験に基づいて必ず編集してください</li>
              <li>Google マップの利用規約を遵守してください</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-1">法的責任について</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>虚偽の口コミ投稿は景品表示法違反に該当する可能性があります</li>
              <li>競合他社に対する虚偽の口コミは不正競争防止法違反に該当する可能性があります</li>
              <li>Google マップの利用規約に違反する投稿はアカウント停止の対象となります</li>
              <li>投稿内容に関する法的責任は投稿者本人に帰属します</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold mb-1">禁止事項</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>来店していない方の利用</li>
              <li>店舗関係者の投稿</li>
              <li className="font-bold text-red-600">
                報酬・割引・特典と引き換えに、店舗が指示した内容の口コミを投稿すること
              </li>
              <li>虚偽情報・誇大表現</li>
              <li>同業他店を批判する内容</li>
              <li>個人が特定できる情報（スタッフの氏名など）を含む投稿</li>
              <li>第三者への依頼</li>
              <li>重複投稿</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-yellow-800">
            これらの規約に違反した場合、法的措置の対象となる可能性があります。必ず実際の体験に基づいた正直な口コミを投稿してください。
          </div>
        </div>
      )}
    </div>
  )
}
