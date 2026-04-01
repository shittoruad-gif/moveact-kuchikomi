import { z } from 'zod'
import { router, publicProcedure } from '../trpc'

const generateInput = z.object({
  storeId: z.number(),
  menuIds: z.array(z.number()),
  storeName: z.string(),
  storeArea: z.string(),
  menuNames: z.array(z.string()),
  purpose: z.string(),
  satisfaction: z.string(),
  staffImpression: z.array(z.string()),
  staffImpressionText: z.string().optional(),
  atmosphere: z.array(z.string()),
  atmosphereText: z.string().optional(),
  visitFrequency: z.string(),
})

function generateMockReviews(input: z.infer<typeof generateInput>): string[] {
  const { storeName, storeArea, menuNames, purpose, satisfaction, staffImpression, staffImpressionText, atmosphere, atmosphereText, visitFrequency } = input
  const menuText = menuNames.join('と')
  const staffText = staffImpression.join('、')
  const atmosphereJoined = atmosphere.join('、')
  const isNegative = satisfaction === '不満' || satisfaction === 'とても不満'

  if (isNegative) {
    return [
      `${storeArea}にある${storeName}で${menuText}を受けました。${purpose}で通い始めましたが、正直なところ期待していたほどの効果は感じられませんでした。施術自体は丁寧でしたが、もう少し事前のカウンセリングで具体的な改善プランを提示していただけると安心できたと思います。${visitFrequency === '初めて' ? '初めての来店' : visitFrequency + 'の来店'}でしたが、次回はもう少し相談してから施術内容を決めたいと感じました。`,
      `${storeArea}の${storeName}に${purpose}の改善を期待して伺いました。${menuText}の施術を受けましたが、${staffText ? staffText + 'という印象はありましたが、' : ''}${atmosphereJoined ? atmosphereJoined + 'な環境ではありましたが、' : ''}施術後の変化は正直あまり実感できませんでした。スタッフの方の対応は悪くなかったので、施術の効果についてもう少し詳しく説明いただけると良いかなと思います。`,
      `${purpose}の悩みを解決したくて${storeArea}の${storeName}を訪れました。${menuText}を体験しましたが、施術前に期待していた効果と実際の結果にはギャップがありました。${visitFrequency === '初めて' ? '初回' : visitFrequency}ということもあり、もう少し通えば変わるのかもしれませんが、1回の施術では改善を感じにくかったです。料金に見合った効果を期待していたので、少し残念に感じました。`,
    ]
  }

  return [
    `${storeArea}にある${storeName}で${menuText}を受けてきました！${purpose}がきっかけで通い始めたのですが、施術後は体が本当に軽くなって驚きました。${staffText ? 'スタッフの方は' + staffText + 'で、' : ''}安心して施術を受けることができました。${visitFrequency === '定期的に通っている' ? '定期的に通っていますが、毎回しっかりと効果を感じています。' : visitFrequency === '初めて' ? '初めてでしたが、丁寧なカウンセリングで不安なく受けられました。' : ''}${storeArea}で整体をお探しの方にはぜひおすすめしたいです！`,
    `${storeArea}の${storeName}に伺いました。${menuText}の施術を受けましたが、${staffText ? staffText + 'なスタッフの方が担当してくださり、' : ''}とても信頼できる施術でした。${atmosphereJoined ? '院内は' + atmosphereJoined + 'で、' : ''}リラックスして過ごせました。${purpose}で悩んでいましたが、的確な施術で症状が和らぎました。${storeArea}エリアでの施術院を探している方には安心しておすすめできます。`,
    `${purpose}に悩んでいたところ、知人の紹介で${storeArea}の${storeName}を知りました。${menuText}を受けたのですが、施術前と比べて体の動きが明らかに変わりました。${staffImpressionText ? staffImpressionText + '。' : staffText ? 'スタッフの方は' + staffText + 'な印象で、' : ''}${atmosphereText ? atmosphereText + '。' : atmosphereJoined ? '院内は' + atmosphereJoined + 'な雰囲気です。' : ''}${visitFrequency === '定期的に通っている' ? '今では定期的に通っていて、体調管理に欠かせない存在になっています。' : 'これからも定期的に通いたいと思います。'}${storeArea}でお悩みの方はぜひ一度試してみてください。`,
  ]
}

export const reviewRouter = router({
  generate: publicProcedure.input(generateInput).mutation(async ({ input }) => {
    // Mock implementation - replace with actual LLM call later
    const variations = generateMockReviews(input)
    return { variations }
  }),
})
