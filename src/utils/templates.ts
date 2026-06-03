export interface TemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: string;
  fields: TemplateField[];
  generatePrompt: (values: Record<string, string>) => string;
}

export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'report-creation',
    name: 'レポート・報告書作成',
    description: '説得力のある論理構成で、客観的な分析レポートや調査報告書の骨子を作成します。',
    emoji: '📊',
    category: '執筆・コンテンツ作成',
    fields: [
      {
        id: 'theme',
        label: 'レポートのテーマ・議題',
        type: 'text',
        placeholder: '例: 国内テイクアウト市場の動向調査、新規事業の市場可能性',
        required: true,
      },
      {
        id: 'purpose',
        label: 'レポートの目的・提出先',
        type: 'select',
        options: [
          { value: 'internal', label: '社内報告用（決裁、役員会提出等、意思決定重視）' },
          { value: 'external', label: 'クライアント・社外提出用（提案・報告、信頼性重視）' },
          { value: 'academic', label: '大学・学術用（論文調、学術的妥当性重視）' },
        ],
        required: true,
      },
      {
        id: 'structure',
        label: 'レポートの構成形式',
        type: 'select',
        options: [
          { value: 'standard', label: '序論・本論・結論（最も一般的）' },
          { value: 'problem-solving', label: '現状・課題・改善策（実務の意思決定向き）' },
          { value: 'investigation', label: '調査背景・結果・示唆（リサーチレポート向き）' },
        ],
        required: true,
      },
      {
        id: 'length',
        label: 'レポートのボリューム・文字数制限',
        type: 'text',
        placeholder: '例: 1500文字程度、A4用紙1枚分、見出しを含めて2000文字以内',
        required: true,
      },
      {
        id: 'dataPoints',
        label: '含めたいデータや事実情報',
        type: 'textarea',
        placeholder: '例: 市場規模は前年比5%増。若年層の利用率が高い。既存製品には〇〇の不満がある。',
        required: false,
      },
      {
        id: 'tone',
        label: '文章のトーン',
        type: 'select',
        options: [
          { value: 'formal', label: 'フォーマル・客観的（である調、数値・事実重視）' },
          { value: 'explanatory', label: '分かりやすい解説調（です・ます調、要約解説重視）' },
        ],
        required: true,
      },
    ],
    generatePrompt: (values) => {
      const purposeText = {
        internal: '社内役員・決裁者向けの意思決定支援レポート（結論ファースト、効率性とファクト重視）',
        external: 'クライアントや協業パートナー向けの公式レポート（客観性と丁寧な根拠提示）',
        academic: '学術研究または専門的な調査レポート（論理的妥当性、根拠の客観性、論文形式）',
      }[values.purpose] || '公式レポート';

      const structureText = {
        standard: '1. 序論（背景・目的） / 2. 本論（調査・分析） / 3. 結論（まとめ・提言）',
        'problem-solving': '1. 現状分析（背景） / 2. 顕在化している課題（分析） / 3. 改善の方向性とアクションプラン（解決策）',
        investigation: '1. 調査の背景と手法 / 2. 調査で得られた主な結果 / 3. 結果から得られるビジネス上の示唆（テイクアウェイ）',
      }[values.structure] || '論理的構成';

      const lengthText = values.length ? values.length.trim() : '指定なし（AIの最適な長さにおまかせ）';

      const toneText = values.tone === 'formal'
        ? '客観的な事実に基づき、主観的な感情を交えない論理的な論文・ビジネス報告書調（〜である、〜だと考えられる）'
        : '専門外の人間でも分かりやすいよう配慮した親切な解説調（〜です、〜となります）';

      const dataSection = values.dataPoints
        ? `\n■ 反映すべきインプットデータ/ファクト情報:\n${values.dataPoints}`
        : '';

      return `あなたには、一流のビジネスアナリストおよび学術リサーチャーとして振る舞っていただきます。
以下の要望に基づいて、説得力のある論理的なレポート/報告書の「タイトル案（2案）」および「詳細な見出し構成（H2, H3）」と、それぞれの章で展開すべき「執筆ガイドラインと主要ファクトの展開方法」を出力してください。

■ レポートテーマ:
${values.theme}

■ レポートの目的・ターゲット:
${purposeText}

■ レポートの推奨構成:
${structureText}

■ 目安のボリューム:
${lengthText}

■ 文章のトーン:
${toneText}${dataSection}

■ 出力フォーマット:
1. 推奨タイトル案 (2案)
2. レポートのサマリー（要旨・キーメッセージを一言でまとめたもの）
3. 詳細な構成案と執筆ガイドライン (各見出し章・節において、どのようなデータを提示し、どのようなロジックを展開すべきか、具体的な段落ごとの指示を含めること)

読み手に知見を提供し、的確な意思決定を促すような高品質な構成案を作成してください。`;
    },
  },
  {
    id: 'business-email',
    name: 'ビジネスメール作成',
    description: '状況や相手との関係性に合わせた、マナーに適ったビジネスメールを作成します。',
    emoji: '✉️',
    category: 'ビジネスコミュニケーション',
    fields: [
      {
        id: 'purpose',
        label: 'メールの用件・目的',
        type: 'select',
        options: [
          { value: 'thanks', label: 'お礼（打ち合わせ後、会食後、紹介等）' },
          { value: 'proposal', label: '提案・依頼（アポイント打診、見積送付等）' },
          { value: 'apology', label: '謝罪（ミスへの対応、納期遅延等）' },
          { value: 'schedule', label: '日程調整（候補日の提示、調整依頼等）' },
          { value: 'inquiry', label: '問い合わせ・質問' },
        ],
        required: true,
      },
      {
        id: 'relation',
        label: '宛先（相手との関係性）',
        type: 'select',
        options: [
          { value: 'client', label: '重要なクライアント・取引先（他社）' },
          { value: 'boss', label: '社内の上司・先輩' },
          { value: 'new-client', label: '新規アプローチ先の担当者' },
          { value: 'colleague', label: '同僚・プロジェクトメンバー' },
        ],
        required: true,
      },
      {
        id: 'details',
        label: '具体的な内容・伝えたいこと',
        type: 'textarea',
        placeholder: '例: 本日の商談のお礼。次回ミーティングは6/10の14時または15時でお願いしたい。資料を添付した件。',
        required: true,
      },
      {
        id: 'tone',
        label: '文章の丁寧さ',
        type: 'select',
        options: [
          { value: 'very-polite', label: '極めて丁寧（謙譲語・尊敬語を厳格に使い分ける）' },
          { value: 'standard', label: '標準的（一般的な敬語、です・ます調）' },
          { value: 'casual-biz', label: '簡潔・スピーディ（社内向けなど、簡潔さを最優先）' },
        ],
        required: true,
      },
    ],
    generatePrompt: (values) => {
      const purposeText = {
        thanks: 'お礼（感謝の意を伝える）',
        proposal: '提案・依頼・アポイントメント打診',
        apology: '真摯な謝罪と今後の対応方針の報告',
        schedule: '日程調整および候補日の提示',
        inquiry: '詳細に関する丁寧な問い合わせ',
      }[values.purpose] || 'ビジネス連絡';

      const relationText = {
        client: '他社の取引先・重要なお客様（礼儀正しさと敬意が最優先される相手）',
        boss: '社内の上司・役員（マナーを守りつつ、報告・連絡・相談が明確に伝わる相手）',
        'new-client': '初めて連絡を取る新規顧客の担当者（安心感とメリットを簡潔にアピールする相手）',
        colleague: '社内の同僚・協働プロジェクトのメンバー（要点を簡潔にしつつ円滑に進行できる関係）',
      }[values.relation] || '仕事の相手';

      const toneText = {
        'very-polite': '極めて丁寧で、非の打ち所がないフォーマルな日本語表現（二重敬語などを避けた綺麗な日本語）',
        standard: '一般的で失礼のない標準的なビジネス敬語（丁寧で自然な表現）',
        'casual-biz': '要点がひと目で伝わる、簡潔かつ無駄のないスマートな表現',
      }[values.tone] || '標準的なビジネス敬語';

      return `あなたには、一流のビジネスパーソンおよびライティングコーチとして振る舞っていただきます。
以下の状況に合わせて、そのまま実務で送信できる、高品質なビジネスメールのドラフトを作成してください。

■ メールの用件・目的:
${purposeText}

■ 送信先 (相手との関係):
${relationText}

■ メールの本文に含めるべき内容:
${values.details}

■ 文章の丁寧さ・トーン:
${toneText}

■ 出力フォーマット:
1. 件名 (用件がひと目で分かり、クリックされやすい件名案を2案提示)
2. 本文 (挨拶、本題、詳細の箇条書き、結びの挨拶、署名プレースホルダーを含めた形式)

メールを送った相手が気持ちよくスムーズに行動できるよう、配慮が行き届いた文章を作成してください。`;
    },
  },
  {
    id: 'summarize',
    name: '文章の要約・リライト',
    description: '長文を要点を絞って整理したり、指定された別の文体に書き直します。',
    emoji: '📝',
    category: '情報整理・編集',
    fields: [
      {
        id: 'sourceText',
        label: '対象の文章',
        type: 'textarea',
        placeholder: 'ここに要約・リライトしたい元のテキストを貼り付けてください。',
        required: true,
      },
      {
        id: 'goal',
        label: '要約・リライトの目的',
        type: 'select',
        options: [
          { value: 'bullet-points', label: '要点を箇条書きで3点にまとめる' },
          { value: 'short-summary', label: '140文字程度の短いサマリーにする' },
          { value: 'easy-read', label: '専門用語を排除して、小学生でもわかる言葉で解説する' },
          { value: 'catchy', label: 'SNS等で映えるキャッチコピー・箇条書きにする' },
        ],
        required: true,
      },
      {
        id: 'tone',
        label: '仕上がりのトーン',
        type: 'select',
        options: [
          { value: 'neutral', label: '中立で客観的なニュース調' },
          { value: 'active', label: '元気で親しみやすいSNS風のトーン' },
          { value: 'professional', label: '知性的で落ち着いたビジネス調' },
        ],
        required: true,
      },
    ],
    generatePrompt: (values) => {
      const goalText = {
        'bullet-points': '重要情報を余すことなく抽出し、最重要ポイントを3点の簡潔な箇条書きで整理する',
        'short-summary': '文章の文脈を崩さずに、140文字程度で全体像がわかるサマリー（要約）にまとめる',
        'easy-read': '専門用語や難しいカタカナ言葉を一般的な日常会話の言葉に置き換え、小学生でも完全に理解できるよう易しくリライトする',
        catchy: '読者の興味を一瞬で引くフック（フックキャッチ）を作り、魅力的なキャッチコピーを交えた形にリライトする',
      }[values.goal] || '分かりやすい要約';

      const toneText = {
        neutral: '客観的な事実に基づいた感情を交えない落ち着いた調子（〜である、〜だ）',
        active: '親しみやすく、適度に絵文字を散りばめた活動的で前向きな調子（〜です！、〜しましょう）',
        professional: 'ビジネス文書として通用する論理的で知性的な調子（〜いたします、〜と推測されます）',
      }[values.tone] || '標準的な調子';

      return `あなたには、優れた編集者および要約のプロフェッショナルとして振る舞っていただきます。
以下の「対象の文章」を読み、指定された「目的」と「トーン」に基づいて、分かりやすく要約・リライトした結果を出力してください。

■ 対象の文章:
"""
${values.sourceText}
"""

■ 要約・リライトの目的:
${goalText}

■ 仕上がりのトーン:
${toneText}

■ 出力フォーマット:
1. ひと目でわかるワンフレーズ要約 (一行で内容を表したもの)
2. メインの要約結果 (指示に従ったリライト文、または箇条書き)
3. 元の文章から抽出した「重要キーワード」(3〜5個)

元の文章の重要な意味やニュアンスを歪めることなく、無駄な贅肉を取り除いた文章を作成してください。`;
    },
  },
  {
    id: 'brainstorming',
    name: 'アイデア発想・壁打ち',
    description: '課題解決のためのアイデアを複数提示したり、企画のアイデアを広げます。',
    emoji: '💡',
    category: '企画・ブレスト',
    fields: [
      {
        id: 'theme',
        label: 'アイデアを考えたいテーマ・課題',
        type: 'text',
        placeholder: '例: カフェの売上を雨の日に1.5倍にする方法、新しい英語学習アプリのコンセプト',
        required: true,
      },
      {
        id: 'target',
        label: '対象とするユーザー・顧客層',
        type: 'text',
        placeholder: '例: 在宅勤務の会社員、スマホを毎日触る高校生',
        required: true,
      },
      {
        id: 'quantity',
        label: '欲しいアイデアの数',
        type: 'select',
        options: [
          { value: '3', label: '厳選した3案（質を最重視、実現可能性高め）' },
          { value: '5', label: 'バランスの取れた5案（定番からユニークなものまで）' },
          { value: '10', label: '切り口を広げた10案（ブレスト用、突飛なアイデア歓迎）' },
        ],
        required: true,
      },
      {
        id: 'constraint',
        label: '前提条件や制限事項 (あれば)',
        type: 'text',
        placeholder: '例: 予算10万円以内、専門知識は不要、オンラインのみで実施可能',
        required: false,
      },
    ],
    generatePrompt: (values) => {
      const quantityText = `${values.quantity}個`;
      const constraintText = values.constraint ? `\n- 前提・制限条件: ${values.constraint}` : '';

      return `あなたには、優れた事業開発コンサルタントおよびクリエイティブディレクターとして振る舞っていただきます。
以下の課題を解決するために、多様な切り口からアイデアを ${quantityText} 提案してください。

■ アイデア創出のテーマ・解決したい課題:
${values.theme}

■ 対象となるターゲット層:
${values.target}
${constraintText}

■ 求めるアイデアの性質:
- 実現可能性、斬新さ、コストパフォーマンスなど、それぞれ異なるアプローチや切り口から発想してください。
- 一般論だけでなく、具体的で「その手があったか」と思わせるユニークな要素を盛り込んでください。

■ 出力フォーマット:
各アイデアについて、以下の項目で論理的かつ分かりやすく説明してください。
- アイデア名 (魅力的なタイトル)
- コンセプト概要 (何をどうするのか)
- なぜターゲットに刺さるのか (ユーザーにとってのメリット・心理)
- 実現に向けた第一歩 (今すぐ始められる具体的なアクションプラン)`;
    },
  },
  {
    id: 'skill-learning',
    name: 'ステップ式スキル学習',
    description: '学びたいスキルに対し、段階的で挫折しない講義形式の学習カリキュラムとロードマップを設計します。',
    emoji: '🎓',
    category: '学習・自己研鑽',
    fields: [
      {
        id: 'skill',
        label: '身につけたいスキルや知識',
        type: 'text',
        placeholder: '例: Pythonプログラミング入門、ロジカルシンキング、投資の基礎知識',
        required: true,
      },
      {
        id: 'target',
        label: '現在のレベル・予備知識',
        type: 'select',
        options: [
          { value: 'beginner', label: '完全初心者（何から始めればいいか分からない）' },
          { value: 'novice', label: '入門書を読んだ程度（言葉の意味は少し分かる）' },
          { value: 'intermediate', label: '基礎はあるが、実践・実務への活かし方が分からない' },
        ],
        required: true,
      },
      {
        id: 'duration',
        label: '講義の回数 (構成数)',
        type: 'select',
        options: [
          { value: '3', label: '全3回コース (超重要エッセンス短期集中)' },
          { value: '5', label: '全5回コース (全体像をバランスよく体系学習)' },
          { value: '10', label: '全10回コース (基礎から応用までじっくり深掘り)' },
        ],
        required: true,
      },
      {
        id: 'method',
        label: '学習の進行スタイル',
        type: 'select',
        options: [
          { value: 'quiz', label: '演習問題・クイズ付き（手を動かして学びたい）' },
          { value: 'theory', label: '理論・原理重視（背景や理由を深く納得したい）' },
          { value: 'work', label: '実践ワーク・アクションプラン重視（すぐに活かしたい）' },
        ],
        required: true,
      },
    ],
    generatePrompt: (values) => {
      const levelText = {
        beginner: '完全な初心者（予備知識ゼロ、専門用語はすべて噛み砕く必要あり）',
        novice: '初歩的な学習者（基本的な用語はわかるが、全体像のつながりが見えていない）',
        intermediate: '中級手前（基礎知識はあるが、実務で使えるアウトプットの方法に飢えている）',
      }[values.target] || '学習者';

      const durationText = `全 ${values.duration} 回`;
      
      const methodText = {
        quiz: '各回の最後に、学習内容の理解度を測る「4択の確認クイズ」と「実践的な小テスト（解答・解説付き）」を配置し、アウトプットを通じて身につく進行スタイル',
        theory: '学問的な背景や「なぜそうなるのか」の論理構造を重視し、実例や日常の身近な例え話（メタファー）を多用して納得感を促す概念学習スタイル',
        work: '受講者が実生活や仕事で今すぐ実践できる「アクションプラン」や「振り返りシートの設計」をセットにし、インプット直後に行動に移せるスタイル',
      }[values.method] || 'バランスの良い学習スタイル';

      return `あなたには、世界一分かりやすく、受講者のモチベーションを高めるプロフェッショナルな教育設計者（インストラクショナルデザイナー）および専門講師として振る舞っていただきます。
以下の学習希望に基づいて、受講者が挫折せず、効果的にステップアップできる「${durationText}」のシラバス（講義計画）と、第1回〜最終回までの具体的な講義原稿の骨子を作成してください。

■ 学びたいスキル・テーマ:
${values.skill}

■ 受講者の現在のレベル:
${levelText}

■ 講義の総回数:
${durationText}

■ 学習の進行スタイル:
${methodText}

■ 出力フォーマット:
1. カリキュラムの全体像（各回の講義テーマと一言要約のロードマップ）
2. 各回（第1回〜第${values.duration}回）の講義構成詳細：
   - 講義の目標 (この回で何が理解できるようになるか)
   - 重要キーワード (2〜3個とそのやさしい解説)
   - 講義のエッセンス (教えるべきコア概念の解説と、理解を助ける日常生活での例え話)
   - スタイルに合わせた要素 (演習クイズ、または理論の深掘り、または今日の実践ワーク)
3. 講師からの学習アドバイスと応援メッセージ

初心者が「これなら自分にも理解できる！楽しい！」と自信を持てるような、丁寧で熱量のある教材を設計してください。`;
    },
  },
  {
    id: 'code-generation',
    name: 'コーディングの依頼・実装作成',
    description: '作りたい機能や処理を詳細に整理し、AIが一度でバグのない動作するコードを生成するための仕様指示書を作成します。',
    emoji: '💻',
    category: '開発・エンジニアリング',
    fields: [
      {
        id: 'appType',
        label: '作成したいものの種類',
        type: 'select',
        options: [
          { value: 'web-app', label: 'Webアプリケーション (React, Next.js, 動的なアプリ)' },
          { value: 'website', label: 'ウェブサイト・LP (静的ページ、紹介サイト)' },
          { value: 'script', label: 'スクリプト・自動化ツール (Python等、プログラム単体)' },
          { value: 'other', label: 'その他' },
        ],
        required: true,
      },
      {
        id: 'costPlan',
        label: 'システム構成・予算プラン',
        type: 'select',
        options: [
          { value: 'free', label: '完全無料 (LocalStorageなどのブラウザ内ローカル保存を活用)' },
          { value: 'standard', label: '標準的な構成 (一般的なフロント＋データベース連携)' },
          { value: 'no-limit', label: '制限なし (最適な技術スタックをAIが自由選択)' },
        ],
        required: true,
      },
      {
        id: 'language',
        label: '使用するプログラミング言語 / 環境の要望',
        type: 'text',
        placeholder: '例: TypeScript + React, Python, Next.js (App Router) など',
        required: true,
      },
      {
        id: 'task',
        label: '作成したい機能・実装したい処理の詳細',
        type: 'textarea',
        placeholder: '例: ユーザーが入力したCSVファイルを解析し、特定の列の合計値を集計してブラウザ上に表形式で描画するReactコンポーネント。',
        required: true,
      },
      {
        id: 'inputsOutputs',
        label: '入出力データや仕様の例 (あれば)',
        type: 'textarea',
        placeholder: '例: 入力データ: CSVファイル (列名: date, amount, category)\n出力: カテゴリごとの合計金額とパーセンテージを表示するテーブル',
        required: false,
      },
      {
        id: 'constraints',
        label: '制約条件や特に考慮してほしい点',
        type: 'textarea',
        placeholder: '例: Tailwind CSSでデザインする、エラーハンドリングを入れる、TypeScriptの型定義を厳格にする、UIはレスポンシブ対応にする',
        required: false,
      },
    ],
    generatePrompt: (values) => {
      const appTypeText = {
        'web-app': '動的な機能を持つWebアプリケーション（Next.js、Reactなど）',
        website: '静的なウェブサイト・LP（HTML/CSS/JS、デザイン重視）',
        script: 'コマンドラインや単一実行で動作するスクリプト・自動化ツール（Python等）',
        other: '指定された用途に最適化されたプログラム',
      }[values.appType] || '開発プログラム';

      const costPlanText = {
        free: '【完全無料構成】サーバーバックエンドや有料の外部データベース、有償APIは一切使用せず、ブラウザのLocalStorage（ローカルストレージ）やクライアント側のメモリ保存のみでデータを完結させ、運用コストが一切かからない構成にしてください。',
        standard: '【標準構成】フロントエンドと一般的な軽量データベース/バックエンドサーバーを連携させた、一般的なシステム構成にしてください。',
        'no-limit': '【制限なし】要件の規模や実用性に合わせて、最適なインフラ・データベース・API構成を自由に選定してください。',
      }[values.costPlan] || '最適な構成';

      const inputsOutputsSection = values.inputsOutputs
        ? `\n■ 入出力データ定義・フォーマット例:\n${values.inputsOutputs}`
        : '';
      const constraintsSection = values.constraints
        ? `\n■ 制約事項・考慮点:\n- ${values.constraints.split('\n').join('\n- ')}`
        : '';

      return `あなたには、非常に優秀なシニアソフトウェアエンジニアおよびシステムアーキテクトとして振る舞っていただきます。
以下の要件に基づいて、要件を満たした完全かつ堅牢なプログラムコードと、実装のアプローチ説明を作成してください。

■ 成果物のタイプ:
${appTypeText}

■ システム構成・コスト要件:
${costPlanText}

■ 開発ターゲット・使用技術:
${values.language}

■ 作成したい機能・処理内容:
${values.task}${inputsOutputsSection}${constraintsSection}

■ 出力フォーマット:
1. 実装の設計方針とアプローチ of the 簡潔な解説 (どのような方針で記述したか)
2. 完成コード (十分なコード内コメント、適切な命名、クリーンコード原則に則り、省略せずにすべて記述すること)
3. コードの解説 (主要な関数やロジックの説明)
4. エッジケース（エラー処理等）についての考慮事項や、動作テストのコード例、または動作検証手順

バグがなく、可読性と保守性の高い、本番運用に耐えうるコードを出力してください。`;
    },
  },
  {
    id: 'custom-prompt',
    name: '自由設計（カスタムプロンプト）',
    description: 'AIの役割、前提条件、入力データ、出力ルールを自由に組み立てて、オリジナルのカスタムプロンプトを作成します。',
    emoji: '🛠️',
    category: '自由設計・カスタム',
    fields: [
      {
        id: 'role',
        label: 'AIに与える役割・専門性 (ロール)',
        type: 'text',
        placeholder: '例: 辛口な編集者、Pythonのシニアエンジニア、財務コンサルタント',
        required: true,
      },
      {
        id: 'context',
        label: '前提条件・解決したい課題 (コンテキスト)',
        type: 'textarea',
        placeholder: '例: 専門的で長い文章を、一般の人にも伝わるように魅力的なキャッチコピーに落とし込みたい。',
        required: false,
      },
      {
        id: 'inputLabel',
        label: '入力データの名前 (ラベル)',
        type: 'text',
        placeholder: '例: 対象の元文章、分析したい売上データ、質問内容',
        required: false,
      },
      {
        id: 'inputData',
        label: '実際の入力データ・文章',
        type: 'textarea',
        placeholder: 'ここに処理させたいテキストやデータを貼り付けてください。',
        required: true,
      },
      {
        id: 'outputFormat',
        label: '出力の形式・条件 (トーンや文字数など)',
        type: 'text',
        placeholder: '例: 箇条書きで3点、日本語の敬語で、マークダウン形式で出力、200文字以内',
        required: true,
      },
    ],
    generatePrompt: (values) => {
      const contextSection = values.context
        ? `\n■ 前提条件・背景:\n${values.context}`
        : '';
      const label = values.inputLabel && values.inputLabel.trim() ? values.inputLabel.trim() : '対象のデータ';
      const inputSection = `\n■ 入力データ (${label}):\n"""\n${values.inputData}\n"""`;

      return `あなたには、プロフェッショナルな【${values.role}】として振る舞っていただきます。
指示に従い、与えられた入力データを適切に処理して最高品質の結果を出力してください。
${contextSection}${inputSection}

■ 出力条件・形式:
- ${values.outputFormat}

上記の要件および制約に従い、結果を出力してください。`;
    },
  },
];
