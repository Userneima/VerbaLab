/**
 * Static learning data index for maintainers and AI agents.
 *
 * This file is intentionally large because it stores built-in collocations,
 * examples, and IELTS seed questions. Do not read the whole file for ordinary
 * tasks. Use the index below and `rg` for a specific verb, collocation id, or
 * exported helper.
 *
 * Sections:
 * - Types and IELTS themes: top of file.
 * - `VERBS`: built-in core verb bank, grouped by verb object. Search `verb: 'Get'`,
 *   `id: 'C001'`, or a phrase such as `get started`.
 * - `IELTS_QUESTIONS`: seed field-practice questions near the end of the file.
 * - Helper exports: `getVerbById`, `getCollocationById`, `getDailyCollocations`,
 *   `getAllCollocations`, `searchCollocations`, `getIELTSContextForPhrase`.
 */
export const VERB_DATA_CONTEXT_INDEX = {
  purpose: 'Built-in collocation bank and IELTS seed questions. Static data, not runtime business logic.',
  readRule: 'Search by verb, collocation id, phrase, or helper name. Avoid full-file reads.',
  majorExports: [
    'IELTS_THEMES',
    'VERBS',
    'IELTS_QUESTIONS',
    'getVerbById',
    'getCollocationById',
    'getDailyCollocations',
    'getAllCollocations',
    'searchCollocations',
    'getIELTSContextForPhrase',
  ],
} as const;

export interface ExampleSentence {
  scenario: 'daily' | 'zju' | 'design';
  content: string;
  /** 例句中文翻译，可选；无则界面显示「暂无翻译」 */
  chinese?: string;
}

/** 'daily' = 母语者日常真实使用；'written' = 书面语，资产区不展示 */
export type UsageType = 'daily' | 'written';

export interface Collocation {
  id: string;
  phrase: string;
  meaning: string;
  /** 仅展示日常口语搭配时使用；默认 daily */
  usage?: UsageType;
  examples: ExampleSentence[];
}

/** IELTS 常考主题，用于造句语境与覆盖雅思考题 */
export const IELTS_THEMES = [
  'Daily routine & habits',
  'Hobbies & free time',
  'Study & education',
  'Work & career',
  'Family & friends',
  'Travel & places',
  'Technology & media',
  'Health & lifestyle',
  'Culture & traditions',
  'Environment & society',
  'Decisions & challenges',
  'Goals & achievements',
  'Communication & language',
  'Personal growth',
] as const;

export interface Verb {
  id: string;
  verb: string;
  meaning: string;
  frequencyRank: number;
  collocations: Collocation[];
}

export const VERBS: Verb[] = [
  {
    id: 'V001', verb: 'Get', meaning: '获得 / 变得', frequencyRank: 1,
    collocations: [
      { id: 'C001', phrase: 'get up', meaning: '起床 / 站起来', examples: [
        { scenario: 'daily', content: 'I get up at 7 every morning to make breakfast.', chinese: '我每天早上七点起床做早饭。' },
        { scenario: 'daily', content: 'She gets up before sunrise to do yoga in the park.', chinese: '她日出前起床去公园练瑜伽。' },
        { scenario: 'zju', content: 'I need to get up early to catch the first bus to the ZJU campus.', chinese: '我需要早起才能搭上第一班去ZJU校园的巴士。' },
        { scenario: 'zju', content: 'On exam days, most students get up earlier than usual to review notes.', chinese: '在考试日，大多数学生比平时更早起床复习笔记。' },
        { scenario: 'design', content: 'Sometimes I get up from my desk to sketch ideas on the whiteboard.', chinese: '有时候我会从桌子上站起来，在白板上画一些想法。' },
        { scenario: 'design', content: 'I always get up and walk around the studio when I need fresh inspiration.', chinese: '当我需要新鲜的灵感时，我总是起床在单间公寓里走来走去。' }
      ]},
      { id: 'C002', phrase: 'get started', meaning: '开始 / 入手', examples: [
        { scenario: 'daily', content: 'Let\'s get started on the cleaning before guests arrive.', chinese: '客人到之前咱们先把打扫搞起来。' },
        { scenario: 'daily', content: 'Once you get started on a good book, it\'s hard to put it down.', chinese: '一本好书一旦开始读，就很难放下。' },
        { scenario: 'zju', content: 'We need to get started on the group project this week.', chinese: '我们需要在本周开始小组项目。' },
        { scenario: 'zju', content: 'The professor said we should get started on our thesis proposals early.', chinese: '教授说我们应该尽早开始我们的论文提案。' },
        { scenario: 'design', content: 'Before we get started, let\'s review the design brief again.', chinese: '在开始之前，让我们再次查看设计简介。' },
        { scenario: 'design', content: 'It\'s important to get started with user research before jumping into wireframes.', chinese: '在进入线框之前，开始进行用户研究非常重要。' }
      ]},
      { id: 'C003', phrase: 'get better', meaning: '变好 / 进步', examples: [
        { scenario: 'daily', content: 'My cooking gets better every time I try a new recipe.', chinese: '每次我尝试新的食谱，我的烹饪都会变得更好。' },
        { scenario: 'daily', content: 'Things will get better once you start exercising regularly.', chinese: '一旦你开始定期锻炼，情况就会好转。' },
        { scenario: 'zju', content: 'My English gets better every time I practice with classmates.', chinese: '每次和同学一起练习，我的英语都会变得更好。' },
        { scenario: 'zju', content: 'Your presentation skills will get better with more practice.', chinese: '多练习，你的演讲技巧会变得更好。' },
        { scenario: 'design', content: 'The prototype gets better after each round of user testing.', chinese: '原型在每轮用户测试后都会变得更好。' },
        { scenario: 'design', content: 'Our color palette got better once we consulted accessibility guidelines.', chinese: '在参考了无障碍设施指南后，我们的调色板效果有所改善。' }
      ]},
      { id: 'C004', phrase: 'get in touch', meaning: '取得联系', examples: [
        { scenario: 'daily', content: 'I\'ll get in touch with you once I have more information.', chinese: '如有更多信息，我会与您联系。' },
        { scenario: 'daily', content: 'We should get in touch with old friends more often.', chinese: '我们应该更频繁地联系老朋友。' },
        { scenario: 'zju', content: 'Please get in touch with the professor before the deadline.', chinese: '请在截止日期前与教授取得联系。' },
        { scenario: 'zju', content: 'I got in touch with the teaching assistant about the assignment requirements.', chinese: '我与助教就作业要求取得了联系。' },
        { scenario: 'design', content: 'We need to get in touch with the client to confirm the requirements.', chinese: '我们需要与客户取得联系，以确认相关要求。' },
        { scenario: 'design', content: 'The PM got in touch with the dev team to discuss feasibility.', chinese: '项目经理与开发团队联系，讨论可行性。' }
      ]},
      { id: 'C005', phrase: 'get along', meaning: '相处融洽', examples: [
        { scenario: 'daily', content: 'My roommates and I get along really well.', chinese: '我和室友相处得很好。' },
        { scenario: 'daily', content: 'It\'s important to get along with your neighbors in an apartment building.', chinese: '在公寓楼里与邻居相处非常重要。' },
        { scenario: 'zju', content: 'It\'s important to get along with your lab partners on long projects.', chinese: '在长期项目中与实验室合作伙伴相处非常重要。' },
        { scenario: 'zju', content: 'International and local students get along better through group activities.', chinese: '国际和本地学生通过小组活动相处得更好。' },
        { scenario: 'design', content: 'Good designers get along with engineers and understand their constraints.', chinese: '优秀的设计师与工程师相处融洽，了解他们的局限性。' },
        { scenario: 'design', content: 'Our team gets along well because we respect each other\'s expertise.', chinese: '我们的团队相处融洽，因为我们尊重彼此的专业知识。' }
      ]},
      { id: 'C006', phrase: 'get rid of', meaning: '摆脱 / 去除', examples: [
        { scenario: 'daily', content: 'I need to get rid of all the unnecessary stuff in my room.', chinese: '我需要清理房间里所有不必要的东西。' },
        { scenario: 'daily', content: 'She wants to get rid of her old habits and develop healthier ones.', chinese: '她想摆脱旧习惯，养成更健康的习惯。' },
        { scenario: 'zju', content: 'We should get rid of the parts of the report that are not relevant.', chinese: '我们应该删除报告中不相关的部分。' },
        { scenario: 'zju', content: 'The library got rid of outdated textbooks to make room for new editions.', chinese: '图书馆摆脱了过时的教科书，为新版本腾出了空间。' },
        { scenario: 'design', content: 'We need to get rid of the features that confuse users.', chinese: '我们需要摆脱让用户感到困惑的功能。' },
        { scenario: 'design', content: 'Getting rid of visual clutter dramatically improved the overall design.', chinese: '摆脱视觉混乱极大地改善了整体设计。' }
      ]},
      { id: 'C007', phrase: 'get used to', meaning: '习惯 / 适应', examples: [
        { scenario: 'daily', content: 'It takes time to get used to a new city.', chinese: '习惯一个新城市需要时间。' },
        { scenario: 'daily', content: 'I\'m gradually getting used to cooking for myself.', chinese: '我逐渐习惯了自己做饭。' },
        { scenario: 'zju', content: 'It took me a semester to get used to the fast pace of ZJU courses.', chinese: '我花了一个学期才习惯了ZJU课程的快节奏。' },
        { scenario: 'zju', content: 'New exchange students need time to get used to the campus layout.', chinese: '新的交换生需要时间来适应校园布局。' },
        { scenario: 'design', content: 'New team members need time to get used to our design process.', chinese: '新团队成员需要时间来适应我们的设计流程。' },
        { scenario: 'design', content: 'Users may take a while to get used to the new interface layout.', chinese: '用户可能需要一段时间才能适应新的界面布局。' }
      ]},
      { id: 'C008', phrase: 'get stuck', meaning: '卡住 / 遇到困难', examples: [
        { scenario: 'daily', content: 'I got stuck in traffic for over an hour this morning.', chinese: '今天早上我被堵在路上一个多小时。' },
        { scenario: 'daily', content: 'Don\'t get stuck on small details—focus on the big picture.', chinese: '不要局限于小细节--专注于大局。' },
        { scenario: 'zju', content: 'I always get stuck on the math part of the exam.', chinese: '我总是卡在考试的数学部分。' },
        { scenario: 'zju', content: 'If you get stuck on a problem, ask your study group for help.', chinese: '如果您遇到问题，请向您的学习小组寻求帮助。' },
        { scenario: 'design', content: 'Sometimes I get stuck when trying to balance aesthetics and function.', chinese: '有时我在试图平衡美学和功能时会陷入困境。' },
        { scenario: 'design', content: 'We got stuck on the layout until we tried a completely different approach.', chinese: '我们一直停留在布局上，直到我们尝试了一种完全不同的方法。' }
      ]},
      { id: 'C009', phrase: 'get back', meaning: '回来 / 恢复 / 回复', examples: [
        { scenario: 'daily', content: 'I\'ll get back to you as soon as I check my schedule.', chinese: '查看日程安排后，我会尽快回复您。' },
        { scenario: 'daily', content: 'After the long vacation, it\'s tough to get back into a routine.', chinese: '长假结束后，很难恢复正常生活。' },
        { scenario: 'zju', content: 'After the holiday, it\'s hard to get back into study mode.', chinese: '假期结束后，很难回到学习模式。' },
        { scenario: 'zju', content: 'The professor promised to get back to us with grades by Friday.', chinese: '教授答应周五前给我们回复成绩。' },
        { scenario: 'design', content: 'Let me get back to you after I review the design files.', chinese: '在我查看设计文件后，我会回复您。' },
        { scenario: 'design', content: 'We decided to get back to the original concept after testing showed better results.', chinese: '在测试显示出更好的结果后，我们决定回到最初的概念。' }
      ]},
      { id: 'C010', phrase: 'get a chance', meaning: '获得机会', examples: [
        { scenario: 'daily', content: 'I finally got a chance to visit that famous restaurant downtown.', chinese: '我终于有机会参观了市中心那家著名的餐厅。' },
        { scenario: 'daily', content: 'If you get a chance, you should really try that new coffee shop.', chinese: '如果你有机会，你真的应该试试那家新开的咖啡馆。' },
        { scenario: 'zju', content: 'Not everyone gets a chance to present in front of the whole class.', chinese: '不是每个人都有机会在全班面前演讲。' },
        { scenario: 'zju', content: 'I hope to get a chance to study abroad next semester.', chinese: '我希望下学期有机会出国留学。' },
        { scenario: 'design', content: 'I got a chance to present my concept to the senior design team.', chinese: '我有机会向高级设计团队展示我的概念。' },
        { scenario: 'design', content: 'Every designer should get a chance to observe real users interacting with their product.', chinese: '每个设计师都应该有机会观察真实的用户与他们的产品交互。' }
      ]},
    ]
  },
  {
    id: 'V002', verb: 'Take', meaning: '拿 / 采取 / 花时间', frequencyRank: 2,
    collocations: [
      { id: 'C011', phrase: 'take a break', meaning: '休息一下', examples: [
        { scenario: 'daily', content: 'I need to take a break after working for three hours straight.', chinese: '我连续工作三个小时后需要休息一下。' },
        { scenario: 'daily', content: 'Let\'s take a break and grab some coffee downstairs.', chinese: '我们休息一下，在楼下喝杯咖啡吧。' },
        { scenario: 'zju', content: 'The professor suggested we take a break between long lectures.', chinese: '教授建议我们在长时间的讲座之间休息一下。' },
        { scenario: 'zju', content: 'During finals week, remember to take a break to avoid burnout.', chinese: '在决赛周期间，请记住休息一下，以避免倦怠。' },
        { scenario: 'design', content: 'It helps to take a break and come back to a design with fresh eyes.', chinese: '休息一下，以清新的眼光回归设计。' },
        { scenario: 'design', content: 'After staring at pixels all day, you need to take a break.', chinese: '盯着像素看了一整天后，你需要休息一下。' }
      ]},
      { id: 'C012', phrase: 'take notes', meaning: '记笔记', examples: [
        { scenario: 'daily', content: 'I take notes during cooking shows to remember the recipes.', chinese: '我在烹饪节目中做笔记，以记住食谱。' },
        { scenario: 'daily', content: 'She always takes notes when reading self-improvement books.', chinese: '她在阅读自我提升书籍时总是做笔记。' },
        { scenario: 'zju', content: 'I always take notes in class to review them before exams.', chinese: '我总是在课堂上做笔记，以便在考试前复习。' },
        { scenario: 'zju', content: 'Taking notes by hand helps me remember lectures better than typing.', chinese: '手写笔记比打字更能帮助我记住讲座。' },
        { scenario: 'design', content: 'During user interviews, I take notes on what confuses them most.', chinese: '在用户访谈中，我会记下让他们最困惑的事情。' },
        { scenario: 'design', content: 'I take notes on design trends I spot in everyday products.', chinese: '我会记录我在日常产品中发现的设计趋势。' }
      ]},
      { id: 'C013', phrase: 'take action', meaning: '采取行动', examples: [
        { scenario: 'daily', content: 'We need to take action before the problem gets worse.', chinese: '我们需要在问题恶化之前采取行动。' },
        { scenario: 'daily', content: 'Instead of complaining, it\'s better to take action and fix things.', chinese: '与其抱怨，不如采取行动并解决问题。' },
        { scenario: 'zju', content: 'The student union decided to take action to improve campus facilities.', chinese: '学生会决定采取行动改善校园设施。' },
        { scenario: 'zju', content: 'If you see academic misconduct, you should take action and report it.', chinese: '如果您发现学术不端行为，您应该采取行动并举报。' },
        { scenario: 'design', content: 'After identifying user pain points, the team took action immediately.', chinese: '在确定用户痛点后，团队立即采取行动。' },
        { scenario: 'design', content: 'Good designers take action on feedback rather than ignoring it.', chinese: '优秀的设计师会根据反馈采取行动，而不是忽视反馈。' }
      ]},
      { id: 'C014', phrase: 'take part in', meaning: '参与 / 参加', examples: [
        { scenario: 'daily', content: 'I love to take part in local community events on weekends.', chinese: '我喜欢在周末参加当地社区活动。' },
        { scenario: 'daily', content: 'My whole family takes part in the annual neighborhood cleanup.', chinese: '我全家都参与了一年一度的街区清洁工作。' },
        { scenario: 'zju', content: 'All students are encouraged to take part in the annual innovation competition.', chinese: '鼓励所有学生参加年度创新大赛。' },
        { scenario: 'zju', content: 'I took part in a hackathon and our team won second place.', chinese: '我参加了黑客马拉松，我们的团队获得了第二名。' },
        { scenario: 'design', content: 'We invited end users to take part in the co-design workshop.', chinese: '我们邀请最终用户参加联合设计研讨会。' },
        { scenario: 'design', content: 'Stakeholders should take part in the early stages of design thinking.', chinese: '利益相关者应参与设计思维的早期阶段。' }
      ]},
      { id: 'C015', phrase: 'take care of', meaning: '照顾 / 处理', examples: [
        { scenario: 'daily', content: 'My sister takes care of our parents when I\'m away.', chinese: '我不在的时候，我姐姐会照顾我们的父母。' },
        { scenario: 'daily', content: 'I\'ll take care of dinner tonight—you just relax.', chinese: '我来处理今晚的晚餐，你放轻松。' },
        { scenario: 'zju', content: 'I need to take care of my registration before the semester begins.', chinese: '我需要在学期开始前完成注册。' },
        { scenario: 'zju', content: 'The TA will take care of grading while the professor is away.', chinese: '教授不在时，助教将负责评分。' },
        { scenario: 'design', content: 'The project manager will take care of the client communication.', chinese: '项目经理将负责与客户的沟通。' },
        { scenario: 'design', content: 'Our QA team takes care of testing before each design release.', chinese: '我们的QA团队负责在每次设计发布之前进行测试。' }
      ]},
      { id: 'C016', phrase: 'take a chance', meaning: '冒险 / 尝试', examples: [
        { scenario: 'daily', content: 'Sometimes you have to take a chance and try something new.', chinese: '有时候，你必须抓住机会尝试新事物。' },
        { scenario: 'daily', content: 'I took a chance on a street food stall and it was delicious.', chinese: '我去了一个街头小吃摊，很美味。' },
        { scenario: 'zju', content: 'I decided to take a chance and apply for the exchange program.', chinese: '我决定抓住机会申请交换计划。' },
        { scenario: 'zju', content: 'Taking a chance on a new elective can open up unexpected interests.', chinese: '冒险选修一门新的选修课可能会引发意想不到的兴趣。' },
        { scenario: 'design', content: 'We took a chance with an unconventional design and it paid off.', chinese: '我们尝试了一种非传统的设计，并获得了回报。' },
        { scenario: 'design', content: 'Sometimes you need to take a chance on a bold color palette.', chinese: '有时您需要尝试大胆的调色板。' }
      ]},
      { id: 'C017', phrase: 'take time', meaning: '花时间 / 需要时间', examples: [
        { scenario: 'daily', content: 'Learning a new skill takes time and consistent effort.', chinese: '学习一项新技能需要时间和持续的努力。' },
        { scenario: 'daily', content: 'Take time to enjoy the small moments in life.', chinese: '花时间享受生活中的小时刻。' },
        { scenario: 'zju', content: 'Writing a good thesis takes time, so start early.', chinese: '写一篇好的论文需要时间，所以尽早开始。' },
        { scenario: 'zju', content: 'It takes time to adjust to university life, but you\'ll get there.', chinese: '适应大学生活需要时间，但您会到达那里。' },
        { scenario: 'design', content: 'Building a strong design system takes time, but it pays off.', chinese: '构建一个强大的设计系统需要时间，但它有回报。' },
        { scenario: 'design', content: 'Good typography takes time to get right, but it transforms the whole design.', chinese: '好的排版需要时间才能正确，但它会改变整个设计。' }
      ]},
      { id: 'C018', phrase: 'take responsibility', meaning: '承担责任', examples: [
        { scenario: 'daily', content: 'You need to take responsibility for your own choices.', chinese: '您需要对自己的选择负责。' },
        { scenario: 'daily', content: 'Adults should take responsibility for their financial planning.', chinese: '成年人应该对他们的财务规划负责。' },
        { scenario: 'zju', content: 'As team leader, I need to take responsibility for the project outcome.', chinese: '作为团队领导，我需要对项目成果负责。' },
        { scenario: 'zju', content: 'Every group member should take responsibility for their assigned section.', chinese: '每个小组成员都应对其分配的部分负责。' },
        { scenario: 'design', content: 'Designers must take responsibility for how their products affect users.', chinese: '设计师必须对其产品对用户的影响负责。' },
        { scenario: 'design', content: 'We take responsibility for ensuring our design is inclusive and accessible.', chinese: '我们有责任确保我们的设计具有包容性和可访问性。' }
      ]},
      { id: 'C019', phrase: 'take advantage of', meaning: '利用 / 充分利用', examples: [
        { scenario: 'daily', content: 'I take advantage of the sunny weather to go for a long run.', chinese: '我利用阳光明媚的天气长途跋涉。' },
        { scenario: 'daily', content: 'You should take advantage of the holiday sale to stock up.', chinese: '您应该利用假日促销来囤货。' },
        { scenario: 'zju', content: 'You should take advantage of the free library resources at ZJU.', chinese: '您应该利用ZJU的免费图书馆资源。' },
        { scenario: 'zju', content: 'Students can take advantage of office hours to clarify difficult concepts.', chinese: '学生可以利用办公时间来澄清困难的概念。' },
        { scenario: 'design', content: 'We took advantage of the new material to create a lighter product.', chinese: '我们利用新材料创造了更轻的产品。' },
        { scenario: 'design', content: 'Take advantage of CSS grid to create more flexible layouts.', chinese: '利用CSS网格创建更灵活的布局。' }
      ]},
      { id: 'C020', phrase: 'take a look', meaning: '看一下 / 检查', examples: [
        { scenario: 'daily', content: 'Can you take a look at my essay before I submit it?', chinese: '在我提交之前，你能看看我的论文吗？' },
        { scenario: 'daily', content: 'Take a look at this photo—doesn\'t the sunset look amazing?', chinese: '看看这张照片，日落不是很美吗？' },
        { scenario: 'zju', content: 'The professor asked us to take a look at the sample paper.', chinese: '教授让我们看一下试卷。' },
        { scenario: 'zju', content: 'Before the exam, take a look at the key formulas one more time.', chinese: '考试前，再看一次关键公式。' },
        { scenario: 'design', content: 'Let me take a look at the wireframe and give you feedback.', chinese: '让我看看线框图，并给您反馈。' },
        { scenario: 'design', content: 'Take a look at how competitors handle their onboarding flow.', chinese: '看看竞争对手如何处理他们的入职流程。' }
      ]},
    ]
  },
  {
    id: 'V003', verb: 'Make', meaning: '制造 / 使得 / 做', frequencyRank: 3,
    collocations: [
      { id: 'C021', phrase: 'make a decision', meaning: '做决定', examples: [
        { scenario: 'daily', content: 'I had to make a decision between two job offers.', chinese: '我不得不在两份工作之间做出决定。' },
        { scenario: 'daily', content: 'Making a decision on what to eat for dinner is sometimes the hardest part of my day.', chinese: '决定晚餐吃什么有时是我一天中最困难的部分。' },
        { scenario: 'zju', content: 'Before choosing your major, make a decision based on your interests.', chinese: '在选择专业之前，请根据您的兴趣做出决定。' },
        { scenario: 'zju', content: 'The committee made a decision to extend the application deadline.', chinese: '委员会决定延长申请截止日期。' },
        { scenario: 'design', content: 'We need to make a decision on the color scheme by tomorrow.', chinese: '我们需要在明天之前就配色方案做出决定。' },
        { scenario: 'design', content: 'Data-driven insights help us make a decision about which features to prioritize.', chinese: '数据驱动的洞察有助于我们决定优先考虑哪些功能。' }
      ]},
      { id: 'C022', phrase: 'make progress', meaning: '取得进步', examples: [
        { scenario: 'daily', content: 'I\'m making progress with my guitar lessons every week.', chinese: '我每周都会在吉他课上取得进步。' },
        { scenario: 'daily', content: 'We\'re finally making progress on renovating the kitchen.', chinese: '我们终于在翻修厨房方面取得了进展。' },
        { scenario: 'zju', content: 'We\'re making progress on the research paper, but still have more to do.', chinese: '我们的研究论文正在取得进展，但还有更多工作要做。' },
        { scenario: 'zju', content: 'She made significant progress in her thesis after getting feedback from her advisor.', chinese: '在得到导师的反馈后，她在论文中取得了重大进展。' },
        { scenario: 'design', content: 'The design team is making progress on the new product interface.', chinese: '设计团队正在新产品界面上取得进展。' },
        { scenario: 'design', content: 'We made progress on the interaction design after the usability test results came in.', chinese: '在可用性测试结果出来后，我们在交互设计方面取得了进展。' }
      ]},
      { id: 'C023', phrase: 'make a plan', meaning: '制定计划', examples: [
        { scenario: 'daily', content: 'Let\'s make a plan for the weekend trip in advance.', chinese: '让我们提前制定周末行程计划。' },
        { scenario: 'daily', content: 'I made a plan to save money by cooking at home more often.', chinese: '我制定了一个计划，通过更频繁地在家做饭来省钱。' },
        { scenario: 'zju', content: 'I always make a plan for the week on Sunday evening.', chinese: '我总是在周日晚上制定一周的计划。' },
        { scenario: 'zju', content: 'Our study group made a plan to cover all exam topics in two weeks.', chinese: '我们的研究小组制定了一个计划，在两周内涵盖所有考试主题。' },
        { scenario: 'design', content: 'We made a plan to finish the prototype within two weeks.', chinese: '我们计划在两周内完成原型。' },
        { scenario: 'design', content: 'Before starting any project, we always make a plan with clear milestones.', chinese: '在开始任何项目之前，我们始终制定具有明确里程碑的计划。' }
      ]},
      { id: 'C024', phrase: 'make sense', meaning: '有意义 / 合理 / 说得通', examples: [
        { scenario: 'daily', content: 'The instructions didn\'t make sense until I watched the video.', chinese: '在我观看视频之前，这些说明毫无意义。' },
        { scenario: 'daily', content: 'It makes sense to buy in bulk if you use it every day.', chinese: '如果您每天都使用它，批量购买是有意义的。' },
        { scenario: 'zju', content: 'The professor\'s explanation finally made sense to me in the second class.', chinese: '教授的解释终于在第二堂课上对我有意义了。' },
        { scenario: 'zju', content: 'Does it make sense to take five courses this semester when you also have an internship?', chinese: '当您也有实习机会时，本学期参加五门课程是否有意义？' },
        { scenario: 'design', content: 'The navigation layout needs to make sense to first-time users.', chinese: '导航布局需要对首次使用的用户有意义。' },
        { scenario: 'design', content: 'If the icon doesn\'t make sense without a label, add a text description.', chinese: '如果没有标签，图标没有意义，请添加文字描述。' }
      ]},
      { id: 'C025', phrase: 'make an effort', meaning: '努力 / 尽力', examples: [
        { scenario: 'daily', content: 'I made an effort to wake up early every day this month.', chinese: '这个月我努力每天早起。' },
        { scenario: 'daily', content: 'She makes an effort to stay in touch with her childhood friends.', chinese: '她努力与儿时的朋友保持联系。' },
        { scenario: 'zju', content: 'You need to make an effort to engage in class discussions.', chinese: '你需要努力参与课堂讨论。' },
        { scenario: 'zju', content: 'The university makes an effort to support students from diverse backgrounds.', chinese: '该大学努力为来自不同背景的学生提供支持。' },
        { scenario: 'design', content: 'The team made an effort to include accessibility features in the design.', chinese: '团队努力在设计中纳入无障碍设施。' },
        { scenario: 'design', content: 'We made an effort to reduce page load time for mobile users.', chinese: '我们努力缩短移动用户的页面加载时间。' }
      ]},
      { id: 'C026', phrase: 'make a mistake', meaning: '犯错', examples: [
        { scenario: 'daily', content: 'I made a mistake in the recipe and added too much salt.', chinese: '我在食谱上犯了一个错误，加了太多的盐。' },
        { scenario: 'daily', content: 'Everyone makes mistakes—what matters is how you handle them.', chinese: '每个人都会犯错--重要的是你如何处理错误。' },
        { scenario: 'zju', content: 'It\'s okay to make a mistake in a draft—just learn from it.', chinese: '在草稿中犯错误是可以的，只需从中吸取教训。' },
        { scenario: 'zju', content: 'I made a mistake in the calculation, which threw off the entire result.', chinese: '我在计算中犯了一个错误，抛弃了整个结果。' },
        { scenario: 'design', content: 'We made a mistake in the first iteration and had to rethink the layout.', chinese: '我们在第一次迭代中犯了一个错误，不得不重新考虑布局。' },
        { scenario: 'design', content: 'Making mistakes early in prototyping is much cheaper than making them in production.', chinese: '在原型设计的早期犯错比在生产中犯错要便宜得多。' }
      ]},
      { id: 'C027', phrase: 'make friends', meaning: '交朋友', examples: [
        { scenario: 'daily', content: 'It\'s easy to make friends when you join a sports club.', chinese: '加入体育俱乐部很容易交到朋友。' },
        { scenario: 'daily', content: 'Moving to a new city means you have to make friends all over again.', chinese: '搬到一个新的城市意味着您必须重新结交朋友。' },
        { scenario: 'zju', content: 'I made friends from different departments in my first week at ZJU.', chinese: '我在ZJU的第一周结交了来自不同部门的朋友。' },
        { scenario: 'zju', content: 'Joining a student club is the quickest way to make friends on campus.', chinese: '加入学生俱乐部是在校园里结交朋友的最快方式。' },
        { scenario: 'design', content: 'Attending design meetups is a great way to make friends in the industry.', chinese: '参加设计见面会是结交业内朋友的好方法。' },
        { scenario: 'design', content: 'Collaborating on open-source projects helps you make friends with designers worldwide.', chinese: '在开源项目上进行合作可以帮助您与世界各地的设计师交朋友。' }
      ]},
      { id: 'C028', phrase: 'make sure', meaning: '确保 / 确认', examples: [
        { scenario: 'daily', content: 'Make sure you lock the door before you leave.', chinese: '离开前请务必锁好门。' },
        { scenario: 'daily', content: 'I always make sure to double-check my packing list before a trip.', chinese: '我总是确保在旅行前仔细检查我的行李清单。' },
        { scenario: 'zju', content: 'Make sure your citation format is correct before submitting.', chinese: '提交前，请确保您的引文格式正确无误。' },
        { scenario: 'zju', content: 'Make sure you back up your thesis file in at least two places.', chinese: '确保至少在两个位置备份论文文件。' },
        { scenario: 'design', content: 'Make sure the design meets the user requirements before handoff.', chinese: '在交接之前，请确保设计符合用户要求。' },
        { scenario: 'design', content: 'Always make sure your color contrast passes WCAG accessibility standards.', chinese: '始终确保您的色彩对比度符合WCAG无障碍标准。' }
      ]},
      { id: 'C029', phrase: 'make a difference', meaning: '产生影响 / 有所不同', examples: [
        { scenario: 'daily', content: 'Even small acts of kindness can make a difference.', chinese: '即使是小小的善举也可以有所作为。' },
        { scenario: 'daily', content: 'Volunteering at the shelter made a real difference in my life.', chinese: '在庇护所做志愿者对我的生活产生了真正的影响。' },
        { scenario: 'zju', content: 'Your research could make a difference in how this problem is solved.', chinese: '您的研究可以改变这个问题的解决方式。' },
        { scenario: 'zju', content: 'One dedicated mentor can make a difference in a student\'s academic career.', chinese: '一位专职导师可以改变学生的学术生涯。' },
        { scenario: 'design', content: 'Good UX design can make a difference in how users feel about a product.', chinese: '良好的用户体验设计可以改变用户对产品的感受。' },
        { scenario: 'design', content: 'Micro-interactions make a big difference in overall user satisfaction.', chinese: '微交互对整体用户满意度有很大影响。' }
      ]},
      { id: 'C030', phrase: 'make use of', meaning: '利用 / 使用', examples: [
        { scenario: 'daily', content: 'I try to make use of every free hour to read or learn something.', chinese: '我尽量利用每一个小时的空闲时间来阅读或学习一些东西。' },
        { scenario: 'daily', content: 'You can make use of leftovers to create a completely new meal.', chinese: '您可以利用剩菜来制作全新的餐点。' },
        { scenario: 'zju', content: 'Students should make use of the campus tutoring center more.', chinese: '学生应更多地利用校园辅导中心。' },
        { scenario: 'zju', content: 'Make use of the online database to find relevant journal articles faster.', chinese: '利用在线数据库更快地查找相关期刊文章。' },
        { scenario: 'design', content: 'We made use of existing design patterns to save development time.', chinese: '我们利用现有的设计模式来节省开发时间。' },
        { scenario: 'design', content: 'Make use of component libraries to maintain consistency across the product.', chinese: '利用组件库来保持整个产品的一致性。' }
      ]},
    ]
  },
  {
    id: 'V004', verb: 'Do', meaning: '做 / 执行', frequencyRank: 4,
    collocations: [
      { id: 'C031', phrase: 'do research', meaning: '做研究 / 调查', examples: [
        { scenario: 'daily', content: 'I always do research before buying an expensive item.', chinese: '在购买昂贵的物品之前，我总是做研究。' },
        { scenario: 'daily', content: 'In my daily life, I always do research before buying an expensive item.', chinese: '在我的日常生活中，我总是在购买昂贵的物品之前做研究。' },
        { scenario: 'zju', content: 'I do research at the lab every afternoon before dinner.', chinese: '我每天下午晚饭前在实验室做研究。' },
        { scenario: 'design', content: 'We do research with real users before starting any design work.', chinese: '在开始任何设计工作之前，我们都会与真实用户进行研究。' }
      ]},
      { id: 'C032', phrase: 'do one\'s best', meaning: '尽力 / 全力以赴', examples: [
        { scenario: 'daily', content: 'I always do my best when I take on a new challenge.', chinese: '当我接受新的挑战时，我总是尽力而为。' },
        { scenario: 'daily', content: 'In my daily life, I always do my best when I take on a new challenge.', chinese: '在我的日常生活中，当我接受新的挑战时，我总是尽力而为。' },
        { scenario: 'zju', content: 'All I can do is do my best in the final exam.', chinese: '我所能做的就是在期末考试中尽我所能。' },
        { scenario: 'design', content: 'Even with limited resources, we did our best to deliver quality work.', chinese: '即使资源有限，我们也尽最大努力提供高质量的工作。' }
      ]},
      { id: 'C033', phrase: 'do a good job', meaning: '做得好', examples: [
        { scenario: 'daily', content: 'You did a good job organizing the family reunion.', chinese: '您在组织家庭团聚方面做得很好。' },
        { scenario: 'daily', content: 'Honestly, you did a good job organizing the family reunion.', chinese: '老实说，你组织家庭团聚的工作做得很好。' },
        { scenario: 'zju', content: 'The study group did a good job on the final presentation.', chinese: '研究小组在最终演讲中做得很好。' },
        { scenario: 'design', content: 'The team did a good job balancing creativity and functionality.', chinese: '团队在平衡创意和功能方面做得很好。' }
      ]},
      { id: 'C034', phrase: 'do without', meaning: '不用...也行 / 没有...凑合', examples: [
        { scenario: 'daily', content: 'I can do without TV, but I can\'t do without the internet.', chinese: '我可以没有电视，但我不能没有互联网。' },
        { scenario: 'daily', content: 'In my daily life, I can do without TV, but I can\'t do without the internet.', chinese: '在日常生活中，我可以没有电视，但我不能没有网络。' },
        { scenario: 'zju', content: 'We had to do without some equipment and improvise during the experiment.', chinese: '实验时我们缺了几件设备，只能临场应变。' },
        { scenario: 'design', content: 'The design can do without the animation if it slows down the app.', chinese: '如果动画减慢了应用程序的速度，设计可以在没有动画的情况下完成。' }
      ]},
      { id: 'C035', phrase: 'do harm', meaning: '造成伤害 / 有害', examples: [
        { scenario: 'daily', content: 'Staying up too late can do harm to your health over time.', chinese: '随着时间的推移，熬夜会损害您的健康。' },
        { scenario: 'daily', content: 'From my perspective, staying up too late can do harm to your health over time.', chinese: '在我看来，熬夜太晚会随着时间的推移对您的健康造成伤害。' },
        { scenario: 'zju', content: 'Plagiarism does harm to your academic reputation permanently.', chinese: '剽窃会永久损害您的学术声誉。' },
        { scenario: 'design', content: 'Poor design can do harm to user experience and brand trust.', chinese: '糟糕的设计可能会损害用户体验和品牌信任。' }
      ]},
      { id: 'C036', phrase: 'do exercise', meaning: '锻炼', examples: [
        { scenario: 'daily', content: 'I try to do exercise at least three times a week.', chinese: '我尝试每周至少锻炼三次。' },
        { scenario: 'daily', content: 'In my daily life, I try to do exercise at least three times a week.', chinese: '在我的日常生活中，我尝试每周至少锻炼三次。' },
        { scenario: 'zju', content: 'Many ZJU students do exercise in the sports center after class.', chinese: '许多ZJU学生下课后在体育中心锻炼身体。' },
        { scenario: 'design', content: 'I find that doing exercise in the morning helps me think more creatively.', chinese: '我发现早上做运动可以帮助我更有创造性地思考。' }
      ]},
      { id: 'C037', phrase: 'do someone a favor', meaning: '帮某人一个忙', examples: [
        { scenario: 'daily', content: 'Could you do me a favor and pick up some milk on your way home?', chinese: '你能帮我一个忙，在回家的路上买点牛奶吗？' },
        { scenario: 'daily', content: 'Sometimes could you do me a favor and pick up some milk on your way home?', chinese: '有时你能帮我一个忙，在回家的路上买点牛奶吗？' },
        { scenario: 'zju', content: 'Can you do me a favor and share your lecture notes from Monday?', chinese: '你能帮我一个忙，分享一下你周一的讲义吗？' },
        { scenario: 'design', content: 'Could you do me a favor and review this wireframe before the meeting?', chinese: '您能帮我一个忙，在会议前检查一下这个线框图吗？' }
      ]},
      { id: 'C038', phrase: 'do a project', meaning: '做项目', examples: [
        { scenario: 'daily', content: 'My kids and I did a craft project together last weekend.', chinese: '上周末我和我的孩子们一起做了一个手工项目。' },
        { scenario: 'daily', content: 'From my perspective, my kids and I did a craft project together last weekend.', chinese: '从我的角度来看，上周末我和我的孩子们一起做了一个手工项目。' },
        { scenario: 'zju', content: 'We are doing a joint project with the computer science department.', chinese: '我们正在与计算机科学系进行一个联合项目。' },
        { scenario: 'design', content: 'Doing a real-world project taught me more than any class.', chinese: '做一个现实世界的项目比任何课程都教会了我更多。' }
      ]},
      { id: 'C039', phrase: 'do the trick', meaning: '奏效 / 解决问题', examples: [
        { scenario: 'daily', content: 'A quick nap should do the trick when I\'m feeling tired.', chinese: '当我感到疲倦时，小睡一会儿应该会起到作用。' },
        { scenario: 'daily', content: 'Another habit I have is that a quick nap should do the trick when I\'m feeling tired.', chinese: '我的另一个习惯是，当我感到疲倦时，小睡一会儿就可以起到作用。' },
        { scenario: 'zju', content: 'A brief review session before the exam usually does the trick.', chinese: '考试前的简短复习通常会起到作用。' },
        { scenario: 'design', content: 'Adding a simple tooltip might do the trick for confused users.', chinese: '添加一个简单的工具提示可能会对困惑的用户有所帮助。' }
      ]},
      { id: 'C040', phrase: 'do well', meaning: '表现好 / 做得出色', examples: [
        { scenario: 'daily', content: 'I did well in my last job interview and got the offer.', chinese: '我在上次面试中表现出色并获得了录用通知。' },
        { scenario: 'daily', content: 'In my daily life, I did well in my last job interview and got the offer.', chinese: '在日常生活中，我在上次面试中表现出色并获得了录用通知。' },
        { scenario: 'zju', content: 'To do well in this course, consistent effort is more important than talent.', chinese: '要想学好这门课程，持续的努力比天赋更重要。' },
        { scenario: 'design', content: 'Products that do well in usability testing tend to succeed in the market.', chinese: '在可用性测试中表现出色的产品往往会在市场上取得成功。' }
      ]},
    ]
  },
  {
    id: 'V005', verb: 'Have', meaning: '有 / 拥有 / 经历', frequencyRank: 5,
    collocations: [
      { id: 'C041', phrase: 'have a meeting', meaning: '开会', examples: [
        { scenario: 'daily', content: 'We have a meeting every Monday morning to plan the week.', chinese: '我们每周一早上开会来计划一周。' },
        { scenario: 'daily', content: 'At home, we have a meeting every Monday morning to plan the week.', chinese: '在家里，我们每周一早上开会来计划一周。' },
        { scenario: 'zju', content: 'Our study group has a meeting before every major assignment.', chinese: '我们的学习小组在每次重大作业之前都会召开一次会议。' },
        { scenario: 'design', content: 'We have a design review meeting every Friday afternoon.', chinese: '我们每周五下午都有一次设计评审会议。' }
      ]},
      { id: 'C042', phrase: 'have a look', meaning: '看一下 / 看看', examples: [
        { scenario: 'daily', content: 'Can you have a look at this and tell me what you think?', chinese: '你能看一下这个并告诉我你的想法吗？' },
        { scenario: 'daily', content: 'From my perspective, can you have a look at this and tell me what you think?', chinese: '从我的角度来看，你能看一下这个并告诉我你的想法吗？' },
        { scenario: 'zju', content: 'I had a look at the sample exam and felt more confident.', chinese: '我看了样本考试，感觉更有信心了。' },
        { scenario: 'design', content: 'Could you have a look at my mockup and give me some feedback?', chinese: '您能看一下我的模型并给我一些反馈吗？' }
      ]},
      { id: 'C043', phrase: 'have trouble', meaning: '遇到困难 / 有麻烦', examples: [
        { scenario: 'daily', content: 'I have trouble sleeping when I\'m stressed about work.', chinese: '当我因工作而感到压力时，我就难以入睡。' },
        { scenario: 'daily', content: 'In my daily life, I have trouble sleeping when I\'m stressed about work.', chinese: '在日常生活中，当我工作压力很大时，我就很难入睡。' },
        { scenario: 'zju', content: 'Many students have trouble understanding the advanced math concepts.', chinese: '许多学生在理解高等数学概念时遇到困难。' },
        { scenario: 'design', content: 'Users have trouble finding the settings icon—it needs to be more visible.', chinese: '用户很难找到设置图标——它需要更加明显。' }
      ]},
      { id: 'C044', phrase: 'have fun', meaning: '享受乐趣 / 玩得开心', examples: [
        { scenario: 'daily', content: 'We had so much fun at the outdoor concert last night.', chinese: '昨晚我们在户外音乐会上玩得很开心。' },
        { scenario: 'daily', content: 'At home, we had so much fun at the outdoor concert last night.', chinese: '昨晚在家里，我们在户外音乐会上玩得很开心。' },
        { scenario: 'zju', content: 'Don\'t forget to have fun and explore the city during your exchange.', chinese: '不要忘记在交流期间享受乐趣并探索这座城市。' },
        { scenario: 'design', content: 'Good design should make the user have fun while completing tasks.', chinese: '好的设计应该让用户在完成任务的同时享受乐趣。' }
      ]},
      { id: 'C045', phrase: 'have an impact', meaning: '产生影响', examples: [
        { scenario: 'daily', content: 'Small daily habits can have a huge impact on your long-term health.', chinese: '日常小习惯会对您的长期健康产生巨大影响。' },
        { scenario: 'daily', content: 'From my perspective, small daily habits can have a huge impact on your long-term health.', chinese: '在我看来，日常小习惯会对您的长期健康产生巨大影响。' },
        { scenario: 'zju', content: 'Your thesis research could have an impact on future engineering practices.', chinese: '您的论文研究可能会对未来的工程实践产生影响。' },
        { scenario: 'design', content: 'Inclusive design has a positive impact on all types of users.', chinese: '包容性设计对所有类型的用户都有积极的影响。' }
      ]},
      { id: 'C046', phrase: 'have a conversation', meaning: '进行对话 / 交谈', examples: [
        { scenario: 'daily', content: 'We had a deep conversation about life goals over dinner.', chinese: '晚餐时我们就人生目标进行了深入的交谈。' },
        { scenario: 'daily', content: 'At home, we had a deep conversation about life goals over dinner.', chinese: '回到家，我们一边吃晚饭，一边深入讨论人生目标。' },
        { scenario: 'zju', content: 'Having a conversation with your professor outside of class can be very useful.', chinese: '在课外与教授交谈非常有用。' },
        { scenario: 'design', content: 'We had a conversation with users to better understand their needs.', chinese: '我们与用户进行了对话，以更好地了解他们的需求。' }
      ]},
      { id: 'C047', phrase: 'have experience', meaning: '有经验', examples: [
        { scenario: 'daily', content: 'He has a lot of experience cooking for large groups.', chinese: '他在为大型团体烹饪方面拥有丰富的经验。' },
        { scenario: 'daily', content: 'From my perspective, he has a lot of experience cooking for large groups.', chinese: '从我的角度来看，他有丰富的为大型团体烹饪的经验。' },
        { scenario: 'zju', content: 'Having experience in teamwork is just as important as academic grades.', chinese: '拥有团队合作经验与学业成绩同样重要。' },
        { scenario: 'design', content: 'I have experience working on both mobile and web design projects.', chinese: '我有从事移动和网页设计项目的经验。' }
      ]},
      { id: 'C048', phrase: 'have access to', meaning: '能使用 / 有权访问', examples: [
        { scenario: 'daily', content: 'Not everyone has access to quality healthcare in rural areas.', chinese: '在农村地区，并非每个人都能获得优质的医疗保健。' },
        { scenario: 'daily', content: 'From my perspective, not everyone has access to quality healthcare in rural areas.', chinese: '在我看来，并不是每个人都能在农村地区获得优质的医疗服务。' },
        { scenario: 'zju', content: 'ZJU students have access to over a million digital academic resources.', chinese: '浙江大学学生可以访问超过一百万个数字学术资源。' },
        { scenario: 'design', content: 'Our team has access to powerful prototyping tools and design software.', chinese: '我们的团队可以使用强大的原型设计工具和设计软件。' }
      ]},
      { id: 'C049', phrase: 'have a break', meaning: '休息 / 暂停', examples: [
        { scenario: 'daily', content: 'Let\'s have a break and go for a short walk outside.', chinese: '我们休息一下，到外面散散步吧。' },
        { scenario: 'daily', content: 'Later on, let\'s have a break and go for a short walk outside.', chinese: '稍后，我们休息一下，到外面散散步吧。' },
        { scenario: 'zju', content: 'We had a break between the two exam papers to clear our heads.', chinese: '我们在两份试卷之间休息了一下，以理清思绪。' },
        { scenario: 'design', content: 'After six hours of work, the design team finally had a break.', chinese: '经过六个小时的工作，设计团队终于休息了。' }
      ]},
      { id: 'C050', phrase: 'have a point', meaning: '有道理 / 说得对', examples: [
        { scenario: 'daily', content: 'You have a point—I should try a different approach.', chinese: '你说得有道理——我应该尝试一种不同的方法。' },
        { scenario: 'daily', content: 'Honestly, you have a point—I should try a different approach.', chinese: '老实说，你说得有道理——我应该尝试不同的方法。' },
        { scenario: 'zju', content: 'The critic had a point when they said the argument lacked evidence.', chinese: '批评者说这个论点缺乏证据，这是有道理的。' },
        { scenario: 'design', content: 'The client had a point about the font size being too small for elderly users.', chinese: '客户认为字体太小，不适合老年用户。' }
      ]},
    ]
  },
  {
    id: 'V006', verb: 'Go', meaning: '去 / 进行 / 变成', frequencyRank: 6,
    collocations: [
      { id: 'C051', phrase: 'go ahead', meaning: '继续 / 开始吧', examples: [
        { scenario: 'daily', content: 'Go ahead and start eating—don\'t wait for me.', chinese: '快开始吃吧——别等我。' },
        { scenario: 'daily', content: 'From my perspective, go ahead and start eating—don\'t wait for me.', chinese: '从我的角度来看，开始吃饭吧——别等我。' },
        { scenario: 'zju', content: 'If everyone is ready, let\'s go ahead with the presentation.', chinese: '如果大家都准备好了，那么我们就开始演示吧。' },
        { scenario: 'design', content: 'The client approved the concept, so we can go ahead with the prototype.', chinese: '客户批准了这个概念，所以我们可以继续制作原型。' }
      ]},
      { id: 'C052', phrase: 'go through', meaning: '经历 / 仔细检查', examples: [
        { scenario: 'daily', content: 'I went through a difficult period after moving to a new city.', chinese: '搬到新城市后，我经历了一段困难时期。' },
        { scenario: 'daily', content: 'In my daily life, I went through a difficult period after moving to a new city.', chinese: '在我的日常生活中，搬到新城市后我经历了一段艰难的时期。' },
        { scenario: 'zju', content: 'Please go through your report carefully before submission.', chinese: '提交前请仔细阅读您的报告。' },
        { scenario: 'design', content: 'Let\'s go through the feedback from last week\'s user testing.', chinese: '让我们看一下上周用户测试的反馈。' }
      ]},
      { id: 'C053', phrase: 'go on', meaning: '继续 / 发生', examples: [
        { scenario: 'daily', content: 'Despite the rain, the event went on as planned.', chinese: '尽管下雨，活动仍按计划进行。' },
        { scenario: 'daily', content: 'the event went on as planned, Despite the rain.', chinese: '尽管下雨，活动仍按计划进行。' },
        { scenario: 'zju', content: 'Class goes on even when only a few students show up.', chinese: '即使只有少数学生出现，课程仍会继续。' },
        { scenario: 'design', content: 'The project went on for two extra weeks due to design changes.', chinese: '由于设计变更，该项目又延长了两周。' }
      ]},
      { id: 'C054', phrase: 'go over', meaning: '复习 / 回顾', examples: [
        { scenario: 'daily', content: 'Let\'s go over the plan one more time before the trip.', chinese: '我们在出发前再仔细检查一下计划吧。' },
        { scenario: 'daily', content: 'Later on, let\'s go over the plan one more time before the trip.', chinese: '稍后，我们在出发前再把计划再看一遍。' },
        { scenario: 'zju', content: 'I go over my notes every Sunday to prepare for the week ahead.', chinese: '我每周日都会复习笔记，为接下来的一周做好准备。' },
        { scenario: 'design', content: 'Let\'s go over the design requirements with the whole team.', chinese: '让我们与整个团队一起讨论一下设计要求。' }
      ]},
      { id: 'C055', phrase: 'go wrong', meaning: '出错 / 出问题', examples: [
        { scenario: 'daily', content: 'Everything went wrong at the worst possible moment.', chinese: '一切都在最糟糕的时刻出了问题。' },
        { scenario: 'daily', content: 'From my perspective, everything went wrong at the worst possible moment.', chinese: '从我的角度来看，一切都在最糟糕的时刻出了问题。' },
        { scenario: 'zju', content: 'When the experiment goes wrong, you document what happened and try again.', chinese: '当实验出错时，您记录发生的情况并重试。' },
        { scenario: 'design', content: 'We need to think about what could go wrong in the user flow.', chinese: '我们需要考虑用户流程中可能出现什么问题。' }
      ]},
      { id: 'C056', phrase: 'go beyond', meaning: '超越 / 不止于此', examples: [
        { scenario: 'daily', content: 'Her kindness went beyond what anyone expected.', chinese: '她的善良超出了所有人的想象。' },
        { scenario: 'daily', content: 'From my perspective, her kindness went beyond what anyone expected.', chinese: '在我看来，她的善良超出了任何人的预期。' },
        { scenario: 'zju', content: 'Great research goes beyond what is written in the textbook.', chinese: '伟大的研究超出了教科书上写的内容。' },
        { scenario: 'design', content: 'We want our designs to go beyond aesthetics and solve real problems.', chinese: '我们希望我们的设计超越美学并解决实际问题。' }
      ]},
      { id: 'C057', phrase: 'go with', meaning: '配合 / 选择', examples: [
        { scenario: 'daily', content: 'I think I\'ll go with the blue jacket—it matches better.', chinese: '我想我会穿蓝色夹克——它更搭配。' },
        { scenario: 'daily', content: 'In my daily life, I think I\'ll go with the blue jacket—it matches better.', chinese: '在日常生活中，我想我会穿蓝色夹克——它更搭配。' },
        { scenario: 'zju', content: 'I decided to go with the simpler argument for the essay.', chinese: '我决定在这篇文章中采用更简单的论点。' },
        { scenario: 'design', content: 'We decided to go with a minimalist layout for the landing page.', chinese: '我们决定为登陆页面采用简约的布局。' }
      ]},
      { id: 'C058', phrase: 'go for', meaning: '争取 / 选择 / 尝试', examples: [
        { scenario: 'daily', content: 'If you really want it, just go for it.', chinese: '如果你真的想要它，就去争取吧。' },
        { scenario: 'daily', content: 'just go for it, If you really want it.', chinese: '如果你真的想要的话，就去做吧。' },
        { scenario: 'zju', content: 'I decided to go for the most challenging project topic.', chinese: '我决定选择最具挑战性的项目主题。' },
        { scenario: 'design', content: 'The team decided to go for a bold, unconventional design direction.', chinese: '团队决定采取大胆、非传统的设计方向。' }
      ]},
      { id: 'C059', phrase: 'go back to', meaning: '回到 / 重新开始', examples: [
        { scenario: 'daily', content: 'Sometimes I go back to basics when I\'m feeling lost.', chinese: '有时，当我感到迷失时，我会回到基础。' },
        { scenario: 'daily', content: 'From my perspective, sometimes I go back to basics when I\'m feeling lost.', chinese: '从我的角度来看，有时当我感到迷失时，我会回到基础。' },
        { scenario: 'zju', content: 'We had to go back to the original data and reanalyze it.', chinese: '我们必须返回原始数据并重新分析它。' },
        { scenario: 'design', content: 'We had to go back to the drawing board after user testing failed.', chinese: '用户测试失败后，我们不得不重新开始。' }
      ]},
      { id: 'C060', phrase: 'go along with', meaning: '同意 / 跟随', examples: [
        { scenario: 'daily', content: 'I decided to go along with the group\'s decision even if I disagreed.', chinese: '即使我不同意，我也决定遵从小组的决定。' },
        { scenario: 'daily', content: 'In my daily life, I decided to go along with the group\'s decision even if I disagreed.', chinese: '在日常生活中，即使我不同意，我也决定服从团队的决定。' },
        { scenario: 'zju', content: 'Not everyone has to go along with the professor\'s interpretation.', chinese: '并不是每个人都必须同意教授的解释。' },
        { scenario: 'design', content: 'I didn\'t fully go along with the client\'s suggestion—I proposed an alternative.', chinese: '我没有完全同意客户的建议——我提出了一个替代方案。' }
      ]},
    ]
  },
  {
    id: 'V007', verb: 'Set', meaning: '设置 / 确立', frequencyRank: 7,
    collocations: [
      { id: 'C061', phrase: 'set up', meaning: '建立 / 设置', examples: [
        { scenario: 'daily', content: 'I need to set up my new phone before the trip.', chinese: '我需要在旅行前设置我的新手机。' },
        { scenario: 'daily', content: 'In my daily life, I need to set up my new phone before the trip.', chinese: '在日常生活中，我需要在旅行前设置我的新手机。' },
        { scenario: 'zju', content: 'The department set up a new mentoring program for freshman.', chinese: '该系为新生设立了一个新的指导计划。' },
        { scenario: 'design', content: 'We need to set up a clear design system before starting the project.', chinese: '在项目开始之前我们需要建立一个清晰的设计系统。' }
      ]},
      { id: 'C062', phrase: 'set goals', meaning: '设定目标', examples: [
        { scenario: 'daily', content: 'I set goals at the beginning of each month to stay focused.', chinese: '我在每个月初设定目标以保持专注。' },
        { scenario: 'daily', content: 'In my daily life, I set goals at the beginning of each month to stay focused.', chinese: '在日常生活中，我会在每个月初设定目标以保持专注。' },
        { scenario: 'zju', content: 'Setting clear academic goals helped me manage my time better at ZJU.', chinese: '设定明确的学术目标帮助我更好地管理在浙江大学的时间。' },
        { scenario: 'design', content: 'The team sets goals at the start of each sprint to track progress.', chinese: '团队在每个冲刺开始时设定目标以跟踪进度。' }
      ]},
      { id: 'C063', phrase: 'set aside', meaning: '留出 / 搁置', examples: [
        { scenario: 'daily', content: 'I set aside one hour each day for reading.', chinese: '我每天留出一小时用于阅读。' },
        { scenario: 'daily', content: 'In my daily life, I set aside one hour each day for reading.', chinese: '在日常生活中，我每天都会留出一小时的时间来读书。' },
        { scenario: 'zju', content: 'Set aside time for extracurricular activities—they are just as important.', chinese: '留出时间参加课外活动——它们同样重要。' },
        { scenario: 'design', content: 'We set aside the visual details and focused on the structure first.', chinese: '我们抛开视觉细节，首先关注结构。' }
      ]},
      { id: 'C064', phrase: 'set a deadline', meaning: '设定截止日期', examples: [
        { scenario: 'daily', content: 'If you don\'t set a deadline, the task will never get done.', chinese: '如果你不设定最后期限，任务将永远无法完成。' },
        { scenario: 'daily', content: 'the task will never get done, If you don\'t set a deadline.', chinese: '如果你不设定最后期限，任务将永远无法完成。' },
        { scenario: 'zju', content: 'Our professor set a strict deadline—no extensions allowed.', chinese: '我们的教授设定了严格的期限——不允许延期。' },
        { scenario: 'design', content: 'We set a deadline to deliver the final designs by end of the month.', chinese: '我们设定了在月底之前交付最终设计的截止日期。' }
      ]},
      { id: 'C065', phrase: 'set an example', meaning: '树立榜样', examples: [
        { scenario: 'daily', content: 'Parents should set an example for their children through their actions.', chinese: '父母应该用自己的行动为孩子树立榜样。' },
        { scenario: 'daily', content: 'From my perspective, parents should set an example for their children through their actions.', chinese: '在我看来，父母应该通过自己的行动为孩子树立榜样。' },
        { scenario: 'zju', content: 'Senior students should set an example of academic integrity for juniors.', chinese: '高年级学生应该为低年级学生树立学术诚信的榜样。' },
        { scenario: 'design', content: 'Leading companies set an example of ethical and inclusive design.', chinese: '领先的公司树立了道德和包容性设计的典范。' }
      ]},
      { id: 'C066', phrase: 'set priorities', meaning: '确定优先级', examples: [
        { scenario: 'daily', content: 'You need to set priorities if you want to balance work and life.', chinese: '如果你想平衡工作和生活，你需要确定优先顺序。' },
        { scenario: 'daily', content: 'Honestly, you need to set priorities if you want to balance work and life.', chinese: '老实说，如果你想平衡工作和生活，你需要确定优先顺序。' },
        { scenario: 'zju', content: 'During exam season, you need to set priorities and focus on key subjects.', chinese: '在考试季节，您需要确定优先顺序并专注于关键科目。' },
        { scenario: 'design', content: 'Let\'s set priorities for which features to include in version one.', chinese: '让我们为第一版中包含的功能设置优先级。' }
      ]},
      { id: 'C067', phrase: 'set limits', meaning: '设定限制', examples: [
        { scenario: 'daily', content: 'It\'s healthy to set limits on screen time each day.', chinese: '每天限制屏幕时间是健康的做法。' },
        { scenario: 'daily', content: 'Another habit I have is that it\'s healthy to set limits on screen time each day.', chinese: '我的另一个习惯是每天限制屏幕时间是健康的。' },
        { scenario: 'zju', content: 'Group projects should set limits on how much each person contributes to avoid imbalance.', chinese: '小组项目应对每个人的贡献设定限制，以避免不平衡。' },
        { scenario: 'design', content: 'We need to set limits on the scope of this project to stay on schedule.', chinese: '我们需要对该项目的范围设定限制，以确保按计划进行。' }
      ]},
      { id: 'C068', phrase: 'set out', meaning: '出发 / 着手开始', examples: [
        { scenario: 'daily', content: 'We set out early in the morning to avoid traffic.', chinese: '为了避开交通堵塞，我们一早就出发了。' },
        { scenario: 'daily', content: 'At home, we set out early in the morning to avoid traffic.', chinese: '在家里，我们一早出发以避免交通拥堵。' },
        { scenario: 'zju', content: 'When I set out to write my thesis, I had no idea how complex it would be.', chinese: '当我开始写论文时，我不知道它会有多复杂。' },
        { scenario: 'design', content: 'When we set out to redesign the app, we interviewed 30 users first.', chinese: '当我们开始重新设计应用程序时，我们首先采访了 30 位用户。' }
      ]},
      { id: 'C069', phrase: 'set the stage', meaning: '奠定基础 / 做铺垫', examples: [
        { scenario: 'daily', content: 'A good morning routine can set the stage for a productive day.', chinese: '良好的早晨习惯可以为富有成效的一天奠定基础。' },
        { scenario: 'daily', content: 'Another habit I have is that a good morning routine can set the stage for a productive day.', chinese: '我的另一个习惯是，良好的早晨习惯可以为富有成效的一天奠定基础。' },
        { scenario: 'zju', content: 'The first chapter of my thesis sets the stage for all the arguments that follow.', chinese: '我论文的第一章为接下来的所有论点奠定了基础。' },
        { scenario: 'design', content: 'The opening screen of an app sets the stage for the entire user experience.', chinese: '应用程序的打开屏幕为整个用户体验奠定了基础。' }
      ]},
      { id: 'C070', phrase: 'set in motion', meaning: '启动 / 推动进行', examples: [
        { scenario: 'daily', content: 'Once you set a habit in motion, it becomes easier to maintain.', chinese: '一旦你养成了一种习惯，它就会变得更容易维持。' },
        { scenario: 'daily', content: 'it becomes easier to maintain, Once you set a habit in motion.', chinese: '一旦你养成了习惯，它就会变得更容易维持。' },
        { scenario: 'zju', content: 'The funding announcement set a series of research projects in motion.', chinese: '资助公告启动了一系列研究项目。' },
        { scenario: 'design', content: 'The kickoff meeting set the project in motion and energized the whole team.', chinese: '启动会议启动了项目并激发了整个团队的活力。' }
      ]},
    ]
  },
  {
    id: 'V008', verb: 'Keep', meaning: '保持 / 坚持 / 继续', frequencyRank: 8,
    collocations: [
      { id: 'C071', phrase: 'keep up', meaning: '保持 / 继续努力', examples: [
        { scenario: 'daily', content: 'Keep up the good work—you\'re doing really well.', chinese: '继续努力——你做得非常好。' },
        { scenario: 'daily', content: 'From my perspective, keep up the good work—you\'re doing really well.', chinese: '从我的角度来看，继续努力——你做得非常好。' },
        { scenario: 'zju', content: 'It\'s hard to keep up with the reading load in this course.', chinese: '很难跟上这门课程的阅读量。' },
        { scenario: 'design', content: 'It\'s important to keep up with the latest design trends and tools.', chinese: '跟上最新的设计趋势和工具非常重要。' }
      ]},
      { id: 'C072', phrase: 'keep track of', meaning: '追踪 / 记录', examples: [
        { scenario: 'daily', content: 'I use an app to keep track of my daily expenses.', chinese: '我使用一个应用程序来跟踪我的日常开支。' },
        { scenario: 'daily', content: 'In my daily life, I use an app to keep track of my daily expenses.', chinese: '在日常生活中，我使用应用程序来跟踪我的日常开支。' },
        { scenario: 'zju', content: 'Keep track of all your academic deadlines to avoid missing submissions.', chinese: '跟踪您所有的学术截止日期，以避免错过提交。' },
        { scenario: 'design', content: 'We use a shared spreadsheet to keep track of design feedback.', chinese: '我们使用共享电子表格来跟踪设计反馈。' }
      ]},
      { id: 'C073', phrase: 'keep in mind', meaning: '记住 / 牢记', examples: [
        { scenario: 'daily', content: 'Keep in mind that the store closes early on weekends.', chinese: '请记住，商店周末关门较早。' },
        { scenario: 'daily', content: 'From my perspective, keep in mind that the store closes early on weekends.', chinese: '从我的角度来看，请记住商店在周末很早就关门了。' },
        { scenario: 'zju', content: 'Keep in mind the assessment criteria when writing your essay.', chinese: '撰写论文时请记住评估标准。' },
        { scenario: 'design', content: 'Keep in mind that not all users are tech-savvy when designing the interface.', chinese: '请记住，在设计界面时，并非所有用户都精通技术。' }
      ]},
      { id: 'C074', phrase: 'keep going', meaning: '坚持 / 继续', examples: [
        { scenario: 'daily', content: 'Even when it\'s hard, you just need to keep going.', chinese: '即使很困难，你也只需要继续前进。' },
        { scenario: 'daily', content: 'you just need to keep going, Even when it\'s hard.', chinese: '你只需要继续前进，即使很困难。' },
        { scenario: 'zju', content: 'During the hardest parts of my thesis, I just told myself to keep going.', chinese: '在论文最困难的部分，我只是告诉自己要继续下去。' },
        { scenario: 'design', content: 'When the design process feels messy, just keep going—clarity will come.', chinese: '当设计过程感觉混乱时，只要继续下去——就会变得清晰起来。' }
      ]},
      { id: 'C075', phrase: 'keep pace with', meaning: '跟上...步伐', examples: [
        { scenario: 'daily', content: 'It\'s hard to keep pace with all the changes in technology.', chinese: '跟上技术的所有变化是很困难的。' },
        { scenario: 'daily', content: 'Another habit I have is that it\'s hard to keep pace with all the changes in technology.', chinese: '我的另一个习惯是很难跟上技术的所有变化。' },
        { scenario: 'zju', content: 'Students need to keep pace with the rapid developments in their fields.', chinese: '学生需要跟上各自领域的快速发展。' },
        { scenario: 'design', content: 'We need to keep pace with competitor products to stay relevant.', chinese: '我们需要与竞争对手的产品保持同步以保持相关性。' }
      ]},
      { id: 'C076', phrase: 'keep in touch', meaning: '保持联系', examples: [
        { scenario: 'daily', content: 'Let\'s keep in touch after you move to the new city.', chinese: '当你搬到新城市后，让我们保持联系。' },
        { scenario: 'daily', content: 'Later on, let\'s keep in touch after you move to the new city.', chinese: '等你搬到新城市后我们再保持联系吧。' },
        { scenario: 'zju', content: 'I try to keep in touch with professors who have given me guidance.', chinese: '我尝试与给予我指导的教授保持联系。' },
        { scenario: 'design', content: 'We should keep in touch with the client throughout the design process.', chinese: '我们应该在整个设计过程中与客户保持联系。' }
      ]},
      { id: 'C077', phrase: 'keep a record', meaning: '记录 / 保存记录', examples: [
        { scenario: 'daily', content: 'I keep a record of what I eat to maintain a healthy diet.', chinese: '我记录我吃的东西以保持健康的饮食。' },
        { scenario: 'daily', content: 'In my daily life, I keep a record of what I eat to maintain a healthy diet.', chinese: '在日常生活中，我会记录自己的饮食，以保持健康的饮食习惯。' },
        { scenario: 'zju', content: 'You should keep a record of all the sources you consult for your paper.', chinese: '您应该记录您为论文查阅的所有来源。' },
        { scenario: 'design', content: 'The team keeps a record of every design decision and the reasoning behind it.', chinese: '团队记录每个设计决策及其背后的推理。' }
      ]},
      { id: 'C078', phrase: 'keep calm', meaning: '保持冷静', examples: [
        { scenario: 'daily', content: 'The key in a crisis is to keep calm and think clearly.', chinese: '危机中的关键是保持冷静并清晰思考。' },
        { scenario: 'daily', content: 'From my perspective, the key in a crisis is to keep calm and think clearly.', chinese: '在我看来，危机的关键是保持冷静和清晰的思考。' },
        { scenario: 'zju', content: 'Keep calm during presentations—nervousness is normal for everyone.', chinese: '演讲时保持冷静——紧张是每个人的正常现象。' },
        { scenario: 'design', content: 'When client feedback is harsh, a good designer keeps calm and asks questions.', chinese: '当客户的反馈很严厉时，优秀的设计师会保持冷静并提出问题。' }
      ]},
      { id: 'C079', phrase: 'keep up with', meaning: '跟上 / 赶上', examples: [
        { scenario: 'daily', content: 'I struggle to keep up with the news every day.', chinese: '我每天都在努力跟上新闻。' },
        { scenario: 'daily', content: 'In my daily life, I struggle to keep up with the news every day.', chinese: '在日常生活中，我每天都在努力跟上新闻。' },
        { scenario: 'zju', content: 'I find it challenging to keep up with the pace of advanced courses.', chinese: '我发现跟上高级课程的步伐具有挑战性。' },
        { scenario: 'design', content: 'It\'s hard to keep up with all the new UI components being released.', chinese: '很难跟上所有正在发布的新 UI 组件。' }
      ]},
      { id: 'C080', phrase: 'keep an eye on', meaning: '留意 / 关注', examples: [
        { scenario: 'daily', content: 'Please keep an eye on the soup while I answer the door.', chinese: '我开门时请留意汤。' },
        { scenario: 'daily', content: 'From my perspective, please keep an eye on the soup while I answer the door.', chinese: '从我的角度来看，请在我开门时留意汤。' },
        { scenario: 'zju', content: 'Keep an eye on the class group chat for important announcements.', chinese: '密切关注班级群聊，了解重要公告。' },
        { scenario: 'design', content: 'We should keep an eye on how users interact with the new feature.', chinese: '我们应该关注用户如何与新功能交互。' }
      ]},
    ]
  },
  {
    id: 'V009', verb: 'Give', meaning: '给予 / 提供', frequencyRank: 9,
    collocations: [
      { id: 'C081', phrase: 'give a presentation', meaning: '做演讲 / 展示', examples: [
        { scenario: 'daily', content: 'I need to give a presentation at work about the new strategy.', chinese: '我需要在工作中做一个关于新战略的演示。' },
        { scenario: 'daily', content: 'In my daily life, I need to give a presentation at work about the new strategy.', chinese: '在日常生活中，我需要在工作中进行有关新战略的演示。' },
        { scenario: 'zju', content: 'Every student has to give a presentation at the end of the semester.', chinese: '每个学生都必须在学期结束时进行演讲。' },
        { scenario: 'design', content: 'I gave a presentation of the final design concept to the whole company.', chinese: '我向整个公司介绍了最终的设计理念。' }
      ]},
      { id: 'C082', phrase: 'give feedback', meaning: '提供反馈', examples: [
        { scenario: 'daily', content: 'I always give feedback in a constructive and respectful way.', chinese: '我总是以建设性和尊重的方式提供反馈。' },
        { scenario: 'daily', content: 'In my daily life, I always give feedback in a constructive and respectful way.', chinese: '在日常生活中，我总是以建设性和尊重的方式提供反馈。' },
        { scenario: 'zju', content: 'The professor gave detailed feedback on our draft reports.', chinese: '教授对我们的报告草稿给出了详细的反馈。' },
        { scenario: 'design', content: 'We give feedback on each other\'s designs during the weekly review.', chinese: '我们在每周评审期间对彼此的设计提供反馈。' }
      ]},
      { id: 'C083', phrase: 'give up', meaning: '放弃', examples: [
        { scenario: 'daily', content: 'I refused to give up even when the going got tough.', chinese: '即使事情变得艰难，我也拒绝放弃。' },
        { scenario: 'daily', content: 'In my daily life, I refused to give up even when the going got tough.', chinese: '在日常生活中，即使遇到困难，我也拒绝放弃。' },
        { scenario: 'zju', content: 'Don\'t give up on a difficult subject—seek help from tutors.', chinese: '不要放弃困难的科目——向导师寻求帮助。' },
        { scenario: 'design', content: 'We almost gave up on the idea, but then user testing proved it worked.', chinese: '我们几乎放弃了这个想法，但后来用户测试证明它是有效的。' }
      ]},
      { id: 'C084', phrase: 'give a hand', meaning: '帮个忙 / 协助', examples: [
        { scenario: 'daily', content: 'Could you give me a hand moving these boxes?', chinese: '你能帮我搬这些箱子吗？' },
        { scenario: 'daily', content: 'Sometimes could you give me a hand moving these boxes?', chinese: '有时你能帮我搬一下这些箱子吗？' },
        { scenario: 'zju', content: 'Senior students often give a hand to juniors who are just starting out.', chinese: '高年级学生经常向刚开始学习的低年级学生提供帮助。' },
        { scenario: 'design', content: 'I asked a colleague to give me a hand with the complex interaction design.', chinese: '我请一位同事帮我完成复杂的交互设计。' }
      ]},
      { id: 'C085', phrase: 'give an example', meaning: '举例说明', examples: [
        { scenario: 'daily', content: 'Can you give an example of what you mean?', chinese: '你能举个例子来说明你的意思吗？' },
        { scenario: 'daily', content: 'From my perspective, can you give an example of what you mean?', chinese: '从我的角度来看，你能举个例子来说明你的意思吗？' },
        { scenario: 'zju', content: 'The professor always gives an example to help explain abstract concepts.', chinese: '教授总是举出例子来帮助解释抽象概念。' },
        { scenario: 'design', content: 'In my portfolio, I always give an example of the problem I was solving.', chinese: '在我的作品集中，我总是举一个我正在解决的问题的例子。' }
      ]},
      { id: 'C086', phrase: 'give advice', meaning: '给建议', examples: [
        { scenario: 'daily', content: 'I give advice to my younger sibling whenever they ask.', chinese: '每当我的弟弟妹妹提出要求时，我都会给他们建议。' },
        { scenario: 'daily', content: 'In my daily life, I give advice to my younger sibling whenever they ask.', chinese: '在日常生活中，每当弟弟妹妹提出要求时，我都会给予他们建议。' },
        { scenario: 'zju', content: 'Academic advisors give advice on course selection and career planning.', chinese: '学术顾问就课程选择和职业规划提供建议。' },
        { scenario: 'design', content: 'Senior designers give advice to juniors on how to present their work.', chinese: '资深设计师为初级设计师提供如何展示他们的作品的建议。' }
      ]},
      { id: 'C087', phrase: 'give credit to', meaning: '给予肯定 / 认可功劳', examples: [
        { scenario: 'daily', content: 'I want to give credit to everyone who helped plan the event.', chinese: '我想感谢所有帮助策划这次活动的人。' },
        { scenario: 'daily', content: 'In my daily life, I want to give credit to everyone who helped plan the event.', chinese: '在日常生活中，我想感谢所有帮助策划这次活动的人。' },
        { scenario: 'zju', content: 'In academic writing, you must give credit to the original authors.', chinese: '在学术写作中，您必须注明原作者。' },
        { scenario: 'design', content: 'It\'s important to give credit to team members when presenting group work.', chinese: '在展示小组工作时，给予团队成员荣誉非常重要。' }
      ]},
      { id: 'C088', phrase: 'give a try', meaning: '试一试', examples: [
        { scenario: 'daily', content: 'I\'ve never tried Thai food, but I\'ll give it a try tonight.', chinese: '我从未尝试过泰国菜，但今晚我会尝试一下。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'ve never tried Thai food, but I\'ll give it a try tonight.', chinese: '我的另一个习惯是我从未尝试过泰国菜，但今晚我会尝试一下。' },
        { scenario: 'zju', content: 'If you\'re not sure about a topic, give it a try—you might enjoy it.', chinese: '如果您对某个主题不确定，请尝试一下 - 您可能会喜欢它。' },
        { scenario: 'design', content: 'Let\'s give the new design tool a try and see if it speeds up our workflow.', chinese: '让我们尝试一下新的设计工具，看看它是否可以加快我们的工作流程。' }
      ]},
      { id: 'C089', phrase: 'give thought to', meaning: '认真考虑', examples: [
        { scenario: 'daily', content: 'Give some thought to where you want to be in five years.', chinese: '考虑一下您五年后想要达到的目标。' },
        { scenario: 'daily', content: 'From my perspective, give some thought to where you want to be in five years.', chinese: '从我的角度来看，请考虑一下您五年后想要达到的目标。' },
        { scenario: 'zju', content: 'Before choosing a thesis topic, give careful thought to its feasibility.', chinese: '在选择论文题目之前，请仔细考虑其可行性。' },
        { scenario: 'design', content: 'We need to give more thought to the accessibility of this feature.', chinese: '我们需要更多地考虑此功能的可访问性。' }
      ]},
      { id: 'C090', phrase: 'give an opinion', meaning: '表达意见', examples: [
        { scenario: 'daily', content: 'I\'m happy to give my opinion, but the final choice is yours.', chinese: '我很乐意发表我的意见，但最终的选择是你的。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'m happy to give my opinion, but the final choice is yours.', chinese: '我的另一个习惯是我很乐意发表自己的意见，但最终的选择是你的。' },
        { scenario: 'zju', content: 'Students are encouraged to give their opinions in seminar discussions.', chinese: '鼓励学生在研讨会讨论中发表意见。' },
        { scenario: 'design', content: 'Everyone on the team gave their opinion during the design critique.', chinese: '团队中的每个人在设计评审期间都发表了自己的意见。' }
      ]},
    ]
  },
  {
    id: 'V010', verb: 'Put', meaning: '放置 / 投入', frequencyRank: 10,
    collocations: [
      { id: 'C091', phrase: 'put together', meaning: '组合 / 整理', examples: [
        { scenario: 'daily', content: 'It took me two hours to put together the new furniture.', chinese: '我花了两个小时才把新家具组装起来。' },
        { scenario: 'daily', content: 'From my perspective, it took me two hours to put together the new furniture.', chinese: '从我的角度来看，我花了两个小时才组装新家具。' },
        { scenario: 'zju', content: 'We put together a strong team for the engineering competition.', chinese: '我们为工程竞赛组建了一支强大的团队。' },
        { scenario: 'design', content: 'I put together a style guide to keep the design consistent.', chinese: '我整理了一份风格指南以保持设计的一致性。' }
      ]},
      { id: 'C092', phrase: 'put forward', meaning: '提出 / 提议', examples: [
        { scenario: 'daily', content: 'She put forward an interesting idea at the community meeting.', chinese: '她在社区会议上提出了一个有趣的想法。' },
        { scenario: 'daily', content: 'From my perspective, she put forward an interesting idea at the community meeting.', chinese: '在我看来，她在社区会议上提出了一个有趣的想法。' },
        { scenario: 'zju', content: 'The research team put forward a new hypothesis based on the data.', chinese: '研究小组根据数据提出了新的假设。' },
        { scenario: 'design', content: 'I put forward three design concepts for the client to choose from.', chinese: '我提出了三个设计理念供客户选择。' }
      ]},
      { id: 'C093', phrase: 'put off', meaning: '推迟 / 拖延', examples: [
        { scenario: 'daily', content: 'I keep putting off the dentist appointment, which is a bad habit.', chinese: '我一直推迟去看牙医，这是一个坏习惯。' },
        { scenario: 'daily', content: 'In my daily life, I keep putting off the dentist appointment, which is a bad habit.', chinese: '在日常生活中，我总是推迟去看牙医，这是一个坏习惯。' },
        { scenario: 'zju', content: 'Don\'t put off studying until the night before the exam.', chinese: '不要把学习推迟到考试前一天晚上。' },
        { scenario: 'design', content: 'We put off the launch to fix a critical accessibility issue.', chinese: '我们推迟了发布以解决关键的可访问性问题。' }
      ]},
      { id: 'C094', phrase: 'put into practice', meaning: '付诸实践', examples: [
        { scenario: 'daily', content: 'I\'m trying to put what I\'ve learned about nutrition into practice.', chinese: '我正在努力将我所学到的营养学知识付诸实践。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'m trying to put what I\'ve learned about nutrition into practice.', chinese: '我的另一个习惯是尝试将我所学到的营养学知识付诸实践。' },
        { scenario: 'zju', content: 'The internship let me put my classroom knowledge into practice.', chinese: '实习让我将课堂知识运用到实践中。' },
        { scenario: 'design', content: 'User research is only useful when you put the findings into practice.', chinese: '用户研究只有在将研究结果付诸实践时才有用。' }
      ]},
      { id: 'C095', phrase: 'put effort into', meaning: '努力投入于', examples: [
        { scenario: 'daily', content: 'I put a lot of effort into learning how to cook this year.', chinese: '今年我花了很多精力学习如何做饭。' },
        { scenario: 'daily', content: 'In my daily life, I put a lot of effort into learning how to cook this year.', chinese: '在日常生活中，今年我花了很多精力学习如何做饭。' },
        { scenario: 'zju', content: 'Put effort into your written assignments—they count toward your grade.', chinese: '认真完成书面作业——它们会计入你的成绩。' },
        { scenario: 'design', content: 'We put tremendous effort into making the product as simple as possible.', chinese: '我们付出巨大的努力使产品尽可能简单。' }
      ]},
      { id: 'C096', phrase: 'put pressure on', meaning: '施加压力', examples: [
        { scenario: 'daily', content: 'Too many deadlines put a lot of pressure on me at once.', chinese: '太多的截止日期立刻给我带来了很大的压力。' },
        { scenario: 'daily', content: 'From my perspective, too many deadlines put a lot of pressure on me at once.', chinese: '从我的角度来看，太多的截止日期同时给我带来了很大的压力。' },
        { scenario: 'zju', content: 'The competitive environment puts pressure on students to perform.', chinese: '竞争激烈的环境给学生带来了表现的压力。' },
        { scenario: 'design', content: 'Tight timelines put pressure on the team to cut corners.', chinese: '紧迫的时间安排给团队带来了走捷径的压力。' }
      ]},
      { id: 'C097', phrase: 'put aside', meaning: '放下 / 暂时搁置', examples: [
        { scenario: 'daily', content: 'Put aside your differences and focus on the common goal.', chinese: '抛开分歧，专注于共同目标。' },
        { scenario: 'daily', content: 'From my perspective, put aside your differences and focus on the common goal.', chinese: '从我的角度来看，抛开分歧，专注于共同目标。' },
        { scenario: 'zju', content: 'Put aside distractions and focus during the study session.', chinese: '在学习期间抛开干扰，集中注意力。' },
        { scenario: 'design', content: 'We put aside personal preferences and focused on what the data suggested.', chinese: '我们抛开个人偏好，专注于数据的建议。' }
      ]},
      { id: 'C098', phrase: 'put on hold', meaning: '暂停 / 搁置', examples: [
        { scenario: 'daily', content: 'We had to put the renovation project on hold due to budget issues.', chinese: '由于预算问题，我们不得不搁置改造项目。' },
        { scenario: 'daily', content: 'At home, we had to put the renovation project on hold due to budget issues.', chinese: '在家里，由于预算问题，我们不得不暂停装修工程。' },
        { scenario: 'zju', content: 'The publication was put on hold while the professor reviewed the data.', chinese: '当教授审查数据时，该出版物被搁置。' },
        { scenario: 'design', content: 'The redesign was put on hold while we gathered more user feedback.', chinese: '当我们收集更多用户反馈时，重新设计被搁置。' }
      ]},
      { id: 'C099', phrase: 'put into words', meaning: '用言语表达', examples: [
        { scenario: 'daily', content: 'Sometimes it\'s hard to put complex emotions into words.', chinese: '有时很难用语言表达复杂的情感。' },
        { scenario: 'daily', content: 'From my perspective, sometimes it\'s hard to put complex emotions into words.', chinese: '在我看来，有时很难用语言来表达复杂的情感。' },
        { scenario: 'zju', content: 'Putting your research findings into clear words is a valuable academic skill.', chinese: '将你的研究结果用清晰的语言表达出来是一项宝贵的学术技能。' },
        { scenario: 'design', content: 'Good design communicates things that are hard to put into words.', chinese: '好的设计能够传达难以用语言表达的东西。' }
      ]},
      { id: 'C100', phrase: 'put up with', meaning: '忍受 / 接受', examples: [
        { scenario: 'daily', content: 'I can\'t put up with noisy neighbors anymore—I\'m moving.', chinese: '我再也无法忍受吵闹的邻居了——我要搬家了。' },
        { scenario: 'daily', content: 'In my daily life, I can\'t put up with noisy neighbors anymore—I\'m moving.', chinese: '在我的日常生活中，我再也无法忍受吵闹的邻居了——我要搬家了。' },
        { scenario: 'zju', content: 'Students often have to put up with difficult group dynamics in team projects.', chinese: '学生们经常不得不忍受团队项目中困难的团队动态。' },
        { scenario: 'design', content: 'Users shouldn\'t have to put up with confusing navigation—fix it.', chinese: '用户不应该忍受混乱的导航——修复它。' }
      ]},
    ]
  },
  {
    id: 'V011', verb: 'Come', meaning: '来 / 出现 / 产生', frequencyRank: 11,
    collocations: [
      { id: 'C101', phrase: 'come up with', meaning: '想出 / 提出', examples: [
        { scenario: 'daily', content: 'I came up with a great idea for my sister\'s birthday party.', chinese: '我为姐姐的生日聚会想出了一个好主意。' },
        { scenario: 'daily', content: 'In my daily life, I came up with a great idea for my sister\'s birthday party.', chinese: '在日常生活中，我为姐姐的生日聚会想出了一个好主意。' },
        { scenario: 'zju', content: 'Our team came up with three possible solutions to the research problem.', chinese: '我们的团队针对研究问题提出了三种可能的解决方案。' },
        { scenario: 'design', content: 'After brainstorming, we came up with a concept that everyone loved.', chinese: '经过集思广益，我们想出了一个大家都喜欢的概念。' }
      ]},
      { id: 'C102', phrase: 'come across', meaning: '偶然遇见 / 给人印象', examples: [
        { scenario: 'daily', content: 'I came across an interesting article about healthy habits.', chinese: '我看到一篇关于健康习惯的有趣文章。' },
        { scenario: 'daily', content: 'In my daily life, I came across an interesting article about healthy habits.', chinese: '在日常生活中，我看到一篇关于健康习惯的有趣文章。' },
        { scenario: 'zju', content: 'I came across this paper while doing background research for my thesis.', chinese: '我在为我的论文做背景研究时发现了这篇论文。' },
        { scenario: 'design', content: 'The design should come across as professional and trustworthy.', chinese: '设计应该给人专业、值得信赖的印象。' }
      ]},
      { id: 'C103', phrase: 'come to a conclusion', meaning: '得出结论', examples: [
        { scenario: 'daily', content: 'After talking it over, we came to the conclusion that moving was the best option.', chinese: '经过一番商量，我们得出的结论是，搬家是最好的选择。' },
        { scenario: 'daily', content: 'we came to the conclusion that moving was the best option, After talking it over.', chinese: '经过讨论，我们得出的结论是搬家是最好的选择。' },
        { scenario: 'zju', content: 'The research team came to the conclusion that the hypothesis was correct.', chinese: '研究小组得出的结论是，该假设是正确的。' },
        { scenario: 'design', content: 'After testing three prototypes, we came to the conclusion that option B worked best.', chinese: '在测试了三个原型后，我们得出的结论是选项 B 效果最好。' }
      ]},
      { id: 'C104', phrase: 'come into play', meaning: '开始起作用 / 发挥作用', examples: [
        { scenario: 'daily', content: 'Personal discipline really comes into play when working from home.', chinese: '在家工作时，个人纪律确实会发挥作用。' },
        { scenario: 'daily', content: 'From my perspective, personal discipline really comes into play when working from home.', chinese: '从我的角度来看，在家工作时个人纪律确实会发挥作用。' },
        { scenario: 'zju', content: 'Cultural awareness comes into play when collaborating with international students.', chinese: '与国际学生合作时，文化意识会发挥作用。' },
        { scenario: 'design', content: 'Ergonomics comes into play when designing physical products for long use.', chinese: '在设计长期使用的物理产品时，人体工程学会发挥作用。' }
      ]},
      { id: 'C105', phrase: 'come up', meaning: '被提出 / 出现', examples: [
        { scenario: 'daily', content: 'An issue came up at work and I had to deal with it immediately.', chinese: '工作中出现问题，我必须立即处理。' },
        { scenario: 'daily', content: 'From my perspective, an issue came up at work and I had to deal with it immediately.', chinese: '从我的角度来看，工作中出现了问题，我必须立即处理。' },
        { scenario: 'zju', content: 'Several interesting questions came up during the seminar discussion.', chinese: '研讨会讨论期间出现了几个有趣的问题。' },
        { scenario: 'design', content: 'A few usability issues came up during the prototype testing session.', chinese: '在原型测试期间出现了一些可用性问题。' }
      ]},
      { id: 'C106', phrase: 'come back to', meaning: '回到 / 重新考虑', examples: [
        { scenario: 'daily', content: 'I\'ll come back to this chapter after I finish the rest of the book.', chinese: '读完本书的其余部分后，我会再回到这一章。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'ll come back to this chapter after I finish the rest of the book.', chinese: '我的另一个习惯是，在读完本书的其余部分后，我会再回到本章。' },
        { scenario: 'zju', content: 'Let\'s come back to this question in the next lecture when we have more context.', chinese: '当我们有更多背景时，让我们在下一讲中回到这个问题。' },
        { scenario: 'design', content: 'We came back to an earlier concept after the new one didn\'t test well.', chinese: '在新概念没有经过良好测试后，我们又回到了早期的概念。' }
      ]},
      { id: 'C107', phrase: 'come from', meaning: '来自 / 源于', examples: [
        { scenario: 'daily', content: 'My passion for cooking comes from watching my grandmother in the kitchen.', chinese: '我对烹饪的热情来自于看着我的祖母在厨房里。' },
        { scenario: 'daily', content: 'From my perspective, my passion for cooking comes from watching my grandmother in the kitchen.', chinese: '从我的角度来看，我对烹饪的热情来自于在厨房里看着祖母。' },
        { scenario: 'zju', content: 'The most innovative ideas often come from cross-disciplinary thinking.', chinese: '最具创新性的想法往往来自跨学科思维。' },
        { scenario: 'design', content: 'The inspiration for this design came from nature and organic forms.', chinese: '这个设计的灵感来自自然和有机形式。' }
      ]},
      { id: 'C108', phrase: 'come to mind', meaning: '想到 / 浮现在脑海', examples: [
        { scenario: 'daily', content: 'When I think of comfort food, pasta always comes to mind.', chinese: '当我想到安慰食物时，我总是想到面食。' },
        { scenario: 'daily', content: 'pasta always comes to mind, When I think of comfort food.', chinese: '当我想到安慰食物时，我总是想到面食。' },
        { scenario: 'zju', content: 'What examples come to mind when you think about sustainable engineering?', chinese: '当您想到可持续工程时，您会想到哪些例子？' },
        { scenario: 'design', content: 'When users think of the brand, a clear visual identity should come to mind.', chinese: '当用户想到品牌时，应该想到一个清晰的视觉识别。' }
      ]},
      { id: 'C109', phrase: 'come to terms with', meaning: '接受 / 习惯', examples: [
        { scenario: 'daily', content: 'It took me months to come to terms with the fact that I had failed.', chinese: '我花了几个月的时间才接受我失败的事实。' },
        { scenario: 'daily', content: 'From my perspective, it took me months to come to terms with the fact that I had failed.', chinese: '从我的角度来看，我花了几个月的时间才接受我失败的事实。' },
        { scenario: 'zju', content: 'Some students struggle to come to terms with the high academic pressure at ZJU.', chinese: '一些学生很难适应浙江大学的高学业压力。' },
        { scenario: 'design', content: 'We had to come to terms with the project\'s technical limitations early on.', chinese: '我们必须尽早接受该项目的技术限制。' }
      ]},
      { id: 'C110', phrase: 'come out', meaning: '出版 / 发布 / 结果', examples: [
        { scenario: 'daily', content: 'The new season of my favorite show comes out next Friday.', chinese: '我最喜欢的节目的新一季将于下周五播出。' },
        { scenario: 'daily', content: 'From my perspective, the new season of my favorite show comes out next Friday.', chinese: '从我的角度来看，我最喜欢的节目的新一季将于下周五播出。' },
        { scenario: 'zju', content: 'My research paper came out in a well-known academic journal last month.', chinese: '我的研究论文上个月发表在一家著名学术期刊上。' },
        { scenario: 'design', content: 'The product finally came out after months of testing and revision.', chinese: '经过几个月的测试和修改，产品终于问世了。' }
      ]},
    ]
  },
  {
    id: 'V012', verb: 'See', meaning: '看见 / 理解 / 看待', frequencyRank: 12,
    collocations: [
      { id: 'C111', phrase: 'see the point', meaning: '理解要点 / 明白意义', examples: [
        { scenario: 'daily', content: 'I see the point you\'re making—it does make sense now.', chinese: '我明白你的意思——现在确实有道理。' },
        { scenario: 'daily', content: 'In my daily life, I see the point you\'re making—it does make sense now.', chinese: '在我的日常生活中，我明白你所说的观点——现在确实有道理。' },
        { scenario: 'zju', content: 'At first I didn\'t see the point of the exercise, but now I understand.', chinese: '起初我不明白练习的意义，但现在我明白了。' },
        { scenario: 'design', content: 'Once users see the point of the feature, their engagement increases.', chinese: '一旦用户看到该功能的要点，他们的参与度就会增加。' }
      ]},
      { id: 'C112', phrase: 'see progress', meaning: '看到进步 / 发现进展', examples: [
        { scenario: 'daily', content: 'I can see real progress in my fitness after two months of training.', chinese: '经过两个月的训练，我可以看到自己的体能有了真正的进步。' },
        { scenario: 'daily', content: 'In my daily life, I can see real progress in my fitness after two months of training.', chinese: '在日常生活中，经过两个月的训练，我可以看到自己的体能有了真正的进步。' },
        { scenario: 'zju', content: 'It feels great to see progress in my writing from last year to this year.', chinese: '看到我的写作从去年到今年的进步真是太好了。' },
        { scenario: 'design', content: 'We saw good progress after incorporating user feedback into the redesign.', chinese: '将用户反馈纳入重新设计后，我们看到了良好的进展。' }
      ]},
      { id: 'C113', phrase: 'see things differently', meaning: '从不同角度看问题', examples: [
        { scenario: 'daily', content: 'Traveling abroad helped me see things differently.', chinese: '出国旅行让我以不同的方式看待事物。' },
        { scenario: 'daily', content: 'From my perspective, traveling abroad helped me see things differently.', chinese: '从我的角度来看，出国旅行让我以不同的方式看待事物。' },
        { scenario: 'zju', content: 'Studying multiple disciplines helps you see things differently and more creatively.', chinese: '学习多个学科可以帮助你以不同的方式、更有创意地看待事物。' },
        { scenario: 'design', content: 'User interviews help the design team see things differently and challenge assumptions.', chinese: '用户访谈帮助设计团队以不同的方式看待事物并挑战假设。' }
      ]},
      { id: 'C114', phrase: 'see potential', meaning: '看到潜力', examples: [
        { scenario: 'daily', content: 'I see great potential in this neighborhood for small businesses.', chinese: '我看到这个社区对于小企业来说有着巨大的潜力。' },
        { scenario: 'daily', content: 'In my daily life, I see great potential in this neighborhood for small businesses.', chinese: '在我的日常生活中，我看到了这个社区对于小型企业的巨大潜力。' },
        { scenario: 'zju', content: 'The professor saw potential in my research idea and encouraged me to pursue it.', chinese: '教授看到了我的研究想法的潜力，并鼓励我去追求它。' },
        { scenario: 'design', content: 'We saw the potential of this material to change the way products are made.', chinese: '我们看到了这种材料改变产品制造方式的潜力。' }
      ]},
      { id: 'C115', phrase: 'see through', meaning: '看穿 / 识破 / 完成', examples: [
        { scenario: 'daily', content: 'I could see through his excuse—it was clearly not true.', chinese: '我看穿了他的借口——这显然不是真的。' },
        { scenario: 'daily', content: 'In my daily life, I could see through his excuse—it was clearly not true.', chinese: '在日常生活中，我能看穿他的借口——这显然不是真的。' },
        { scenario: 'zju', content: 'A good research methodology can see through surface data to find deeper insights.', chinese: '好的研究方法可以透过表面数据找到更深入的见解。' },
        { scenario: 'design', content: 'We committed to seeing the project through despite the many challenges.', chinese: '尽管面临许多挑战，我们仍致力于完成该项目。' }
      ]},
      { id: 'C116', phrase: 'see the benefit', meaning: '看到好处 / 认识到益处', examples: [
        { scenario: 'daily', content: 'I started to see the benefit of waking up early after a week of trying.', chinese: '经过一周的尝试后，我开始看到早起的好处。' },
        { scenario: 'daily', content: 'In my daily life, I started to see the benefit of waking up early after a week of trying.', chinese: '在日常生活中，经过一周的尝试，我开始看到早起的好处。' },
        { scenario: 'zju', content: 'Once you see the benefit of critical thinking, it changes how you study.', chinese: '一旦你看到批判性思维的好处，它就会改变你的学习方式。' },
        { scenario: 'design', content: 'Users started to see the benefit of the new workflow after the second week.', chinese: '第二周后，用户开始看到新工作流程的好处。' }
      ]},
      { id: 'C117', phrase: 'see it from...', meaning: '从...角度理解', examples: [
        { scenario: 'daily', content: 'Try to see it from the other person\'s perspective before judging.', chinese: '在做出判断之前，尝试从对方的角度来看问题。' },
        { scenario: 'daily', content: 'From my perspective, try to see it from the other person\'s perspective before judging.', chinese: '从我的角度来看，在做出判断之前，尝试从对方的角度来看。' },
        { scenario: 'zju', content: 'A good essay sees the issue from multiple academic perspectives.', chinese: '一篇好的论文从多个学术角度看待这个问题。' },
        { scenario: 'design', content: 'Always try to see the design from the user\'s point of view.', chinese: '始终尝试从用户的角度看待设计。' }
      ]},
      { id: 'C118', phrase: 'see value in', meaning: '在...中发现价值', examples: [
        { scenario: 'daily', content: 'I see value in spending time alone to recharge.', chinese: '我认为花时间独处来充电是有价值的。' },
        { scenario: 'daily', content: 'In my daily life, I see value in spending time alone to recharge.', chinese: '在我的日常生活中，我认为花时间独处来充电是有价值的。' },
        { scenario: 'zju', content: 'I see value in taking courses outside my major for a broader perspective.', chinese: '我认为参加专业之外的课程以获得更广阔的视野是有价值的。' },
        { scenario: 'design', content: 'The client started to see value in the research phase once they saw the insights.', chinese: '一旦客户看到了见解，他们就开始看到研究阶段的价值。' }
      ]},
      { id: 'C119', phrase: 'see the connection', meaning: '发现联系', examples: [
        { scenario: 'daily', content: 'After the lecture, I started to see the connection between theory and practice.', chinese: '听完讲座后，我开始看到理论与实践的联系。' },
        { scenario: 'daily', content: 'I started to see the connection between theory and practice, After the lecture.', chinese: '讲座结束后，我开始看到理论与实践之间的联系。' },
        { scenario: 'zju', content: 'Once you see the connection between all the topics, the course makes much more sense.', chinese: '一旦您看到所有主题之间的联系，该课程就会变得更有意义。' },
        { scenario: 'design', content: 'We need to help users see the connection between different features.', chinese: '我们需要帮助用户看到不同功能之间的联系。' }
      ]},
      { id: 'C120', phrase: 'see the result', meaning: '看到结果', examples: [
        { scenario: 'daily', content: 'After weeks of effort, I finally started to see the result.', chinese: '经过几周的努力，我终于开始看到结果。' },
        { scenario: 'daily', content: 'You won\'t see the result overnight—it takes steady practice.', chinese: '不可能一夜就看到成果，需要持续练习。' },
        { scenario: 'zju', content: 'It\'s motivating to see the result of your hard work in your final grade.', chinese: '在期末成绩中看到你努力学习的结果是令人鼓舞的。' },
        { scenario: 'design', content: 'We were excited to see the result of the usability improvements in the data.', chinese: '我们很高兴看到数据可用性改进的结果。' }
      ]},
    ]
  },
  {
    id: 'V013', verb: 'Know', meaning: '知道 / 了解', frequencyRank: 13,
    collocations: [
      { id: 'C121', phrase: 'know how to', meaning: '知道如何做', examples: [
        { scenario: 'daily', content: 'I know how to cook several dishes from different cuisines.', chinese: '我知道如何烹饪不同菜系的几种菜肴。' },
        { scenario: 'daily', content: 'In my daily life, I know how to cook several dishes from different cuisines.', chinese: '在日常生活中，我知道如何烹饪不同菜系的几种菜肴。' },
        { scenario: 'zju', content: 'Knowing how to manage your time is a critical skill at university.', chinese: '知道如何管理时间是大学的一项关键技能。' },
        { scenario: 'design', content: 'A good designer knows how to balance visual appeal and usability.', chinese: '优秀的设计师知道如何平衡视觉吸引力和可用性。' }
      ]},
      { id: 'C122', phrase: 'know for sure', meaning: '确定 / 肯定知道', examples: [
        { scenario: 'daily', content: 'I don\'t know for sure yet, but I think we\'re going to Paris.', chinese: '我还不确定，但我想我们要去巴黎。' },
        { scenario: 'daily', content: 'In my daily life, I don\'t know for sure yet, but I think we\'re going to Paris.', chinese: '在我的日常生活中，我还不确定，但我想我们要去巴黎。' },
        { scenario: 'zju', content: 'We won\'t know for sure until the results are published next week.', chinese: '在下周结果公布之前我们无法确定。' },
        { scenario: 'design', content: 'We don\'t know for sure which design works better until we test them.', chinese: '在测试之前，我们无法确定哪种设计效果更好。' }
      ]},
      { id: 'C123', phrase: 'know the difference', meaning: '知道区别 / 区分', examples: [
        { scenario: 'daily', content: 'Do you know the difference between a need and a want?', chinese: '你知道需要和想要之间的区别吗？' },
        { scenario: 'daily', content: 'From my perspective, do you know the difference between a need and a want?', chinese: '从我的角度来看，您知道需要和想要之间的区别吗？' },
        { scenario: 'zju', content: 'It\'s important to know the difference between correlation and causation in research.', chinese: '了解研究中相关性和因果性之间的区别很重要。' },
        { scenario: 'design', content: 'Designers should know the difference between UI and UX clearly.', chinese: '设计师应该清楚地了解 UI 和 UX 之间的区别。' }
      ]},
      { id: 'C124', phrase: 'know what it takes', meaning: '知道需要什么 / 了解条件', examples: [
        { scenario: 'daily', content: 'Starting a business is tough—do you know what it takes?', chinese: '创业是艰难的——你知道需要什么吗？' },
        { scenario: 'daily', content: 'From my perspective, starting a business is tough—do you know what it takes?', chinese: '在我看来，创业是艰难的——你知道创业需要什么吗？' },
        { scenario: 'zju', content: 'I know what it takes to get a top grade in this course.', chinese: '我知道如何才能在这门课程中获得高分。' },
        { scenario: 'design', content: 'After years of experience, I know what it takes to lead a design project.', chinese: '经过多年的经验，我知道领导一个设计项目需要什么。' }
      ]},
      { id: 'C125', phrase: 'know better', meaning: '应该更清楚 / 不该那样做', examples: [
        { scenario: 'daily', content: 'I should have known better than to skip breakfast before a long day.', chinese: '我应该知道在漫长的一天之前不要不吃早餐。' },
        { scenario: 'daily', content: 'In my daily life, I should have known better than to skip breakfast before a long day.', chinese: '在我的日常生活中，我应该知道在漫长的一天之前最好不吃早餐。' },
        { scenario: 'zju', content: 'You know better than to submit work without proofreading it.', chinese: '您知道最好不要在没有校对的情况下提交作品。' },
        { scenario: 'design', content: 'Experienced designers know better than to ignore user feedback.', chinese: '经验丰富的设计师知道不能忽视用户反馈。' }
      ]},
      { id: 'C126', phrase: 'know by heart', meaning: '熟记 / 烂熟于心', examples: [
        { scenario: 'daily', content: 'I know this song by heart—I\'ve heard it hundreds of times.', chinese: '我熟记这首歌——我已经听过数百遍了。' },
        { scenario: 'daily', content: 'In my daily life, I know this song by heart—I\'ve heard it hundreds of times.', chinese: '在我的日常生活中，我熟记这首歌——我已经听过数百遍了。' },
        { scenario: 'zju', content: 'I know the key formulas by heart after doing so many practice problems.', chinese: '做了这么多练习题之后，我把关键公式都背下来了。' },
        { scenario: 'design', content: 'Good designers know common UI patterns by heart and apply them instinctively.', chinese: '优秀的设计师熟记常见的 UI 模式并本能地应用它们。' }
      ]},
      { id: 'C127', phrase: 'know the importance', meaning: '了解重要性', examples: [
        { scenario: 'daily', content: 'I know the importance of sleep after years of ignoring it.', chinese: '在忽视睡眠多年后，我知道了它的重要性。' },
        { scenario: 'daily', content: 'In my daily life, I know the importance of sleep after years of ignoring it.', chinese: '在日常生活中，我在多年忽视睡眠后才知道它的重要性。' },
        { scenario: 'zju', content: 'All students should know the importance of citing sources correctly.', chinese: '所有学生都应该知道正确引用来源的重要性。' },
        { scenario: 'design', content: 'Our team knows the importance of accessibility in product design.', chinese: '我们的团队知道可访问性在产品设计中的重要性。' }
      ]},
      { id: 'C128', phrase: 'know in advance', meaning: '提前知道', examples: [
        { scenario: 'daily', content: 'If you know in advance about the traffic, you can plan a different route.', chinese: '如果您提前了解交通情况，您可以规划不同的路线。' },
        { scenario: 'daily', content: 'you can plan a different route, If you know in advance about the traffic.', chinese: '如果您提前了解交通情况，您可以计划不同的路线。' },
        { scenario: 'zju', content: 'Students should know in advance what to expect in the final exam format.', chinese: '学生应该提前知道期末考试的形式。' },
        { scenario: 'design', content: 'We knew in advance that the deadline was tight, so we prepared early.', chinese: '我们提前知道期限很紧，所以早早做好了准备。' }
      ]},
      { id: 'C129', phrase: 'know the basics', meaning: '了解基础 / 掌握基本知识', examples: [
        { scenario: 'daily', content: 'Before investing, you should at least know the basics of finance.', chinese: '在投资之前，你至少应该了解金融的基础知识。' },
        { scenario: 'daily', content: 'you should at least know the basics of finance, Before investing.', chinese: '在投资之前，你至少应该了解金融的基础知识。' },
        { scenario: 'zju', content: 'Knowing the basics of programming is now essential in almost every field.', chinese: '了解编程基础知识现在几乎在每个领域都至关重要。' },
        { scenario: 'design', content: 'Every designer should know the basics of typography and color theory.', chinese: '每个设计师都应该了解版式和色彩理论的基础知识。' }
      ]},
      { id: 'C130', phrase: 'know the reason', meaning: '知道原因', examples: [
        { scenario: 'daily', content: 'I need to know the reason why this keeps happening.', chinese: '我需要知道这种情况持续发生的原因。' },
        { scenario: 'daily', content: 'In my daily life, I need to know the reason why this keeps happening.', chinese: '在日常生活中，我需要知道这种情况不断发生的原因。' },
        { scenario: 'zju', content: 'Understanding your data means knowing the reason behind the patterns you see.', chinese: '了解您的数据意味着了解您所看到的模式背后的原因。' },
        { scenario: 'design', content: 'We need to know the reason users drop off at this point in the flow.', chinese: '我们需要知道用户在流程中此时退出的原因。' }
      ]},
    ]
  },
  {
    id: 'V014', verb: 'Think', meaning: '思考 / 认为 / 考虑', frequencyRank: 14,
    collocations: [
      { id: 'C131', phrase: 'think about', meaning: '考虑 / 思考', examples: [
        { scenario: 'daily', content: 'I\'ve been thinking about changing my career for a while.', chinese: '一段时间以来，我一直在考虑改变我的职业。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'ve been thinking about changing my career for a while.', chinese: '我的另一个习惯是，我有一段时间一直在考虑改变我的职业。' },
        { scenario: 'zju', content: 'Think about the broader implications of your research before drawing conclusions.', chinese: '在得出结论之前，请考虑您的研究的更广泛的影响。' },
        { scenario: 'design', content: 'We need to think about how the product will age over time.', chinese: '我们需要考虑产品会如何随着时间的推移而老化。' }
      ]},
      { id: 'C132', phrase: 'think outside the box', meaning: '创新思维 / 打破常规', examples: [
        { scenario: 'daily', content: 'For the party decoration, I tried to think outside the box.', chinese: '对于派对装饰，我尝试跳出框框思考。' },
        { scenario: 'daily', content: 'I tried to think outside the box, For the party decoration.', chinese: '我尝试跳出框框思考派对装饰。' },
        { scenario: 'zju', content: 'Professors encourage students to think outside the box, not just memorize facts.', chinese: '教授鼓励学生跳出框框思考，而不仅仅是死记硬背。' },
        { scenario: 'design', content: 'The best design solutions come from thinking outside the box.', chinese: '最好的设计解决方案来自于跳出框框的思考。' }
      ]},
      { id: 'C133', phrase: 'think ahead', meaning: '提前考虑 / 未雨绸缪', examples: [
        { scenario: 'daily', content: 'If you think ahead, you can avoid most last-minute problems.', chinese: '如果你提前思考，你就可以避免大多数最后一刻出现的问题。' },
        { scenario: 'daily', content: 'you can avoid most last-minute problems, If you think ahead.', chinese: '如果你提前思考，你可以避免大多数最后一刻的问题。' },
        { scenario: 'zju', content: 'Think ahead and plan your course selection for the entire degree program.', chinese: '提前思考并计划整个学位课程的课程选择。' },
        { scenario: 'design', content: 'We need to think ahead about how the design will scale as the user base grows.', chinese: '我们需要提前考虑设计如何随着用户群的增长而扩展。' }
      ]},
      { id: 'C134', phrase: 'think critically', meaning: '批判性地思考', examples: [
        { scenario: 'daily', content: 'It\'s important to think critically about the news you consume online.', chinese: '批判性地思考您在网上浏览的新闻非常重要。' },
        { scenario: 'daily', content: 'Another habit I have is that it\'s important to think critically about the news you consume online.', chinese: '我的另一个习惯是，批判性地思考你在网上浏览的新闻很重要。' },
        { scenario: 'zju', content: 'University education should teach you to think critically, not just absorb information.', chinese: '大学教育应该教会你批判性思考，而不仅仅是吸收信息。' },
        { scenario: 'design', content: 'Thinking critically about user behavior helps us avoid design bias.', chinese: '批判性地思考用户行为有助于我们避免设计偏差。' }
      ]},
      { id: 'C135', phrase: 'think it through', meaning: '想清楚 / 仔细考虑', examples: [
        { scenario: 'daily', content: 'Before you say yes, think it through carefully.', chinese: '在你说“是”之前，请仔细考虑一下。' },
        { scenario: 'daily', content: 'think it through carefully, Before you say yes.', chinese: '在你说“是”之前，请仔细考虑一下。' },
        { scenario: 'zju', content: 'Don\'t rush into your thesis topic—think it through thoroughly first.', chinese: '不要急于进入你的论文主题——首先要彻底思考。' },
        { scenario: 'design', content: 'Let\'s think through the entire user journey before we start designing.', chinese: '在开始设计之前，让我们仔细考虑一下整个用户旅程。' }
      ]},
      { id: 'C136', phrase: 'think in terms of', meaning: '从...角度思考', examples: [
        { scenario: 'daily', content: 'Try to think in terms of long-term benefits, not just immediate rewards.', chinese: '尝试着眼于长期利益，而不仅仅是眼前的回报。' },
        { scenario: 'daily', content: 'not just immediate rewards, Try to think in terms of long-term benefits.', chinese: '不要只考虑眼前的回报，尝试考虑长期利益。' },
        { scenario: 'zju', content: 'Think in terms of systems, not just individual components, in your engineering thesis.', chinese: '在工程论文中，要从系统角度思考，而不仅仅是单个组件。' },
        { scenario: 'design', content: 'We should think in terms of the entire user experience, not just one screen.', chinese: '我们应该考虑整个用户体验，而不仅仅是一个屏幕。' }
      ]},
      { id: 'C137', phrase: 'think of a way', meaning: '想出一个方法', examples: [
        { scenario: 'daily', content: 'I need to think of a way to explain this to my parents.', chinese: '我需要想办法向我的父母解释这一点。' },
        { scenario: 'daily', content: 'In my daily life, I need to think of a way to explain this to my parents.', chinese: '在日常生活中，我需要想办法向父母解释这一点。' },
        { scenario: 'zju', content: 'We need to think of a way to conduct this experiment with limited equipment.', chinese: '我们需要想办法用有限的设备进行这个实验。' },
        { scenario: 'design', content: 'The team worked all night to think of a way to simplify the checkout flow.', chinese: '团队通宵工作，想出一种简化结账流程的方法。' }
      ]},
      { id: 'C138', phrase: 'think it over', meaning: '再想想 / 重新考虑', examples: [
        { scenario: 'daily', content: 'I need to think it over before I give you my final answer.', chinese: '在给你最终答案之前我需要考虑一下。' },
        { scenario: 'daily', content: 'In my daily life, I need to think it over before I give you my final answer.', chinese: '在我的日常生活中，我需要仔细考虑一下，然后才能给你我的最终答案。' },
        { scenario: 'zju', content: 'Think it over carefully before choosing whether to take that extra course.', chinese: '在选择是否参加额外课程之前请仔细考虑。' },
        { scenario: 'design', content: 'The client asked us to think it over and come back with a revised concept.', chinese: '客户要求我们仔细考虑并提出修改后的概念。' }
      ]},
      { id: 'C139', phrase: 'think beyond', meaning: '超越常规思考 / 拓展视野', examples: [
        { scenario: 'daily', content: 'To solve big problems, you need to think beyond quick fixes.', chinese: '要解决大问题，您需要考虑的不仅仅是快速解决方案。' },
        { scenario: 'daily', content: 'you need to think beyond quick fixes, To solve big problems.', chinese: '你需要思考的不仅仅是快速修复，而是要解决大问题。' },
        { scenario: 'zju', content: 'Think beyond your major to see how your knowledge applies to other fields.', chinese: '超越你的专业，看看你的知识如何应用到其他领域。' },
        { scenario: 'design', content: 'Great designers think beyond the brief to anticipate future user needs.', chinese: '伟大的设计师会超越简述来预测未来的用户需求。' }
      ]},
      { id: 'C140', phrase: 'think of', meaning: '想到 / 认为', examples: [
        { scenario: 'daily', content: 'When I think of relaxation, I think of sitting by the ocean.', chinese: '当我想到放松时，我就会想到坐在海边。' },
        { scenario: 'daily', content: 'I think of sitting by the ocean, When I think of relaxation.', chinese: '当我想到放松时，我想到坐在海边。' },
        { scenario: 'zju', content: 'What do you think of the new grading system they\'re proposing?', chinese: '您如何看待他们提出的新评分系统？' },
        { scenario: 'design', content: 'We need to think of a simpler name for this feature.', chinese: '我们需要为该功能想一个更简单的名称。' }
      ]},
    ]
  },
  {
    id: 'V015', verb: 'Find', meaning: '发现 / 找到 / 觉得', frequencyRank: 15,
    collocations: [
      { id: 'C141', phrase: 'find a solution', meaning: '找到解决方案', examples: [
        { scenario: 'daily', content: 'We need to find a solution before the problem gets worse.', chinese: '我们需要在问题变得更糟之前找到解决方案。' },
        { scenario: 'daily', content: 'At home, we need to find a solution before the problem gets worse.', chinese: '在家里，我们需要在问题变得更糟之前找到解决方案。' },
        { scenario: 'zju', content: 'The team worked together to find a solution to the experiment failure.', chinese: '团队共同努力寻找解决实验失败的方法。' },
        { scenario: 'design', content: 'Finding a solution that works for all user types is the design challenge.', chinese: '找到适合所有用户类型的解决方案是设计挑战。' }
      ]},
      { id: 'C142', phrase: 'find out', meaning: '发现 / 弄清楚', examples: [
        { scenario: 'daily', content: 'I need to find out when the next train departs.', chinese: '我需要知道下一趟火车什么时候出发。' },
        { scenario: 'daily', content: 'In my daily life, I need to find out when the next train departs.', chinese: '在我的日常生活中，我需要知道下一趟火车什么时候出发。' },
        { scenario: 'zju', content: 'I want to find out how other universities approach this research problem.', chinese: '我想了解其他大学如何解决这个研究问题。' },
        { scenario: 'design', content: 'We need to find out why users are abandoning the cart at this step.', chinese: '我们需要找出用户在这一步放弃购物车的原因。' }
      ]},
      { id: 'C143', phrase: 'find it difficult', meaning: '发现很困难', examples: [
        { scenario: 'daily', content: 'I find it difficult to say no to people sometimes.', chinese: '我发现有时很难对别人说不。' },
        { scenario: 'daily', content: 'In my daily life, I find it difficult to say no to people sometimes.', chinese: '在日常生活中，我发现有时很难对别人说不。' },
        { scenario: 'zju', content: 'Many students find it difficult to adapt to the self-directed learning style.', chinese: '许多学生发现很难适应自主学习方式。' },
        { scenario: 'design', content: 'Users find it difficult to understand the difference between the two options.', chinese: '用户发现很难理解这两个选项之间的区别。' }
      ]},
      { id: 'C144', phrase: 'find time', meaning: '抽出时间', examples: [
        { scenario: 'daily', content: 'It\'s hard to find time for hobbies with a busy schedule.', chinese: '日程繁忙，很难找到时间培养兴趣爱好。' },
        { scenario: 'daily', content: 'Another habit I have is that it\'s hard to find time for hobbies with a busy schedule.', chinese: '我的另一个习惯是，日程繁忙时很难找到时间从事兴趣爱好。' },
        { scenario: 'zju', content: 'I always find time to review my notes after each lecture.', chinese: '每堂课结束后我总是抽出时间复习笔记。' },
        { scenario: 'design', content: 'We need to find time to do proper research before the design phase.', chinese: '我们需要在设计阶段之前找时间进行适当的研究。' }
      ]},
      { id: 'C145', phrase: 'find a way', meaning: '找到方法', examples: [
        { scenario: 'daily', content: 'There\'s always a way to find a way if you\'re determined enough.', chinese: '只要你有足够的决心，总有办法找到方法。' },
        { scenario: 'daily', content: 'Another habit I have is that there\'s always a way to find a way if you\'re determined enough.', chinese: '我的另一个习惯是，只要你有足够的决心，总有办法找到办法。' },
        { scenario: 'zju', content: 'We need to find a way to present complex data in a simple format.', chinese: '我们需要找到一种方法以简单的格式呈现复杂的数据。' },
        { scenario: 'design', content: 'We need to find a way to guide users without using too much text.', chinese: '我们需要找到一种在不使用太多文字的情况下引导用户的方法。' }
      ]},
      { id: 'C146', phrase: 'find common ground', meaning: '找到共同点', examples: [
        { scenario: 'daily', content: 'Despite our differences, we found common ground on the important things.', chinese: '尽管我们存在分歧，但我们在重要的事情上找到了共同点。' },
        { scenario: 'daily', content: 'we found common ground on the important things, Despite our differences.', chinese: '尽管我们存在分歧，但我们在重要的事情上找到了共同点。' },
        { scenario: 'zju', content: 'During group projects, it\'s important to find common ground on the direction.', chinese: '在小组项目中，找到方向上的共同点很重要。' },
        { scenario: 'design', content: 'Finding common ground between client needs and user needs is key to good design.', chinese: '找到客户需求和用户需求之间的共同点是良好设计的关键。' }
      ]},
      { id: 'C147', phrase: 'find inspiration', meaning: '找到灵感', examples: [
        { scenario: 'daily', content: 'I find inspiration for writing in the most unexpected places.', chinese: '我在最意想不到的地方找到写作灵感。' },
        { scenario: 'daily', content: 'In my daily life, I find inspiration for writing in the most unexpected places.', chinese: '在日常生活中，我会在最意想不到的地方找到写作灵感。' },
        { scenario: 'zju', content: 'I found inspiration for my thesis in an old paper from the 1970s.', chinese: '我在 20 世纪 70 年代的一篇旧论文中找到了我论文的灵感。' },
        { scenario: 'design', content: 'Designers often find inspiration in nature, art, and other industries.', chinese: '设计师经常在自然、艺术和其他行业中寻找灵感。' }
      ]},
      { id: 'C148', phrase: 'find it helpful', meaning: '觉得有用 / 发现很有帮助', examples: [
        { scenario: 'daily', content: 'I find it helpful to write down my thoughts before a difficult conversation.', chinese: '我发现在进行困难的谈话之前写下我的想法很有帮助。' },
        { scenario: 'daily', content: 'In my daily life, I find it helpful to write down my thoughts before a difficult conversation.', chinese: '在日常生活中，我发现在进行困难的谈话之前写下自己的想法很有帮助。' },
        { scenario: 'zju', content: 'Many students find it helpful to form a study group before exams.', chinese: '许多学生发现考试前组建学习小组很有帮助。' },
        { scenario: 'design', content: 'Users find it helpful when the app remembers their preferences.', chinese: '当应用程序记住他们的偏好时，用户会发现它很有帮助。' }
      ]},
      { id: 'C149', phrase: 'find value in', meaning: '在...中发现价值', examples: [
        { scenario: 'daily', content: 'I find value in taking long walks without any devices.', chinese: '我发现在没有任何设备的情况下进行长途步行很有价值。' },
        { scenario: 'daily', content: 'In my daily life, I find value in taking long walks without any devices.', chinese: '在我的日常生活中，我发现在没有任何设备的情况下进行长途步行是有价值的。' },
        { scenario: 'zju', content: 'I find value in attending optional lectures—they often give the best insights.', chinese: '我发现参加选修讲座很有价值——它们通常会给出最好的见解。' },
        { scenario: 'design', content: 'Users need to find immediate value in the product within the first minute.', chinese: '用户需要在第一分钟内立即发现产品的价值。' }
      ]},
      { id: 'C150', phrase: 'find the problem', meaning: '找到问题所在', examples: [
        { scenario: 'daily', content: 'The mechanic took an hour to find the problem with my car.', chinese: '机械师花了一个小时才找到我的车的问题。' },
        { scenario: 'daily', content: 'From my perspective, the mechanic took an hour to find the problem with my car.', chinese: '从我的角度来看，机械师花了一个小时才找到我的车的问题。' },
        { scenario: 'zju', content: 'Finding the root of the problem in data analysis is more important than the solution.', chinese: '在数据分析中找到问题的根源比解决方案更重要。' },
        { scenario: 'design', content: 'User testing helps us find the problem before the product is launched.', chinese: '用户测试可以帮助我们在产品上线之前发现问题。' }
      ]},
    ]
  },
  {
    id: 'V016', verb: 'Tell', meaning: '告诉 / 区分 / 说', frequencyRank: 16,
    collocations: [
      { id: 'C151', phrase: 'tell the difference', meaning: '区分 / 辨别', examples: [
        { scenario: 'daily', content: 'Can you tell the difference between these two wines?', chinese: '你能看出这两种酒的区别吗？' },
        { scenario: 'daily', content: 'From my perspective, can you tell the difference between these two wines?', chinese: '从我的角度来看，你能分辨出这两种酒的区别吗？' },
        { scenario: 'zju', content: 'As you read more, you\'ll be able to tell the difference between good and bad arguments.', chinese: '当你阅读更多内容时，你将能够区分好的论点和坏的论点。' },
        { scenario: 'design', content: 'Users should be able to tell the difference between interactive and static elements.', chinese: '用户应该能够区分交互式元素和静态元素之间的区别。' }
      ]},
      { id: 'C152', phrase: 'tell a story', meaning: '讲故事 / 叙述', examples: [
        { scenario: 'daily', content: 'She can tell a story in a way that keeps everyone at the edge of their seats.', chinese: '她讲故事的方式可以让每个人都坐立不安。' },
        { scenario: 'daily', content: 'From my perspective, she can tell a story in a way that keeps everyone at the edge of their seats.', chinese: '在我看来，她讲故事的方式可以让每个人都坐立不安。' },
        { scenario: 'zju', content: 'A strong thesis tells a coherent story from the first chapter to the last.', chinese: '一篇强有力的论文从第一章到最后一章讲述了一个连贯的故事。' },
        { scenario: 'design', content: 'Great products tell a story that users connect with emotionally.', chinese: '优秀的产品会讲述一个与用户产生情感联系的故事。' }
      ]},
      { id: 'C153', phrase: 'tell the truth', meaning: '说实话', examples: [
        { scenario: 'daily', content: 'It\'s always better to tell the truth, even when it\'s uncomfortable.', chinese: '说实话总是更好的选择，即使这让人感到不舒服。' },
        { scenario: 'daily', content: 'I had to tell the truth at the meeting—I couldn\'t cover for my colleague.', chinese: '在会上我只能说实话——没法再替同事打掩护了。' },
        { scenario: 'zju', content: 'In academic writing, tell the truth about your findings—even if they\'re not what you expected.', chinese: '在学术写作中，要真实地讲述你的发现——即使它们不是你所期望的。' },
        { scenario: 'design', content: 'Good user testing tells the truth about how people actually use a product.', chinese: '良好的用户测试可以揭示人们实际如何使用产品的真相。' }
      ]},
      { id: 'C154', phrase: 'tell apart', meaning: '区分 / 辨别', examples: [
        { scenario: 'daily', content: 'The twins look so alike that I can\'t tell them apart.', chinese: '这对双胞胎长得很像，我分不清他们。' },
        { scenario: 'daily', content: 'From my perspective, the twins look so alike that I can\'t tell them apart.', chinese: '从我的角度来看，这对双胞胎看起来非常相似，以至于我无法区分他们。' },
        { scenario: 'zju', content: 'Without reading the labels, I couldn\'t tell apart the control and test groups.', chinese: '如果不阅读标签，我无法区分对照组和测试组。' },
        { scenario: 'design', content: 'The buttons are too similar—users can\'t tell them apart easily.', chinese: '这些按钮太相似——用户无法轻易区分它们。' }
      ]},
      { id: 'C155', phrase: 'tell from experience', meaning: '凭经验判断 / 经验告诉我', examples: [
        { scenario: 'daily', content: 'I can tell from experience that rushing a project never ends well.', chinese: '我从经验中知道，匆忙完成一个项目永远不会有好结果。' },
        { scenario: 'daily', content: 'In my daily life, I can tell from experience that rushing a project never ends well.', chinese: '在日常生活中，我的经验告诉我，匆忙完成一个项目永远不会有好结果。' },
        { scenario: 'zju', content: 'I can tell from experience that starting a thesis early reduces stress significantly.', chinese: '我从经验中可以看出，尽早开始论文可以显着减轻压力。' },
        { scenario: 'design', content: 'I can tell from experience that users always interact with a product differently than expected.', chinese: '我从经验中可以看出，用户与产品的交互方式总是与预期不同。' }
      ]},
      { id: 'C156', phrase: 'tell at a glance', meaning: '一眼看出 / 瞬间判断', examples: [
        { scenario: 'daily', content: 'I can tell at a glance if the food is fresh or not.', chinese: '我一眼就能看出食物是否新鲜。' },
        { scenario: 'daily', content: 'In my daily life, I can tell at a glance if the food is fresh or not.', chinese: '在日常生活中，我一眼就能看出食物是否新鲜。' },
        { scenario: 'zju', content: 'A well-organized presentation lets the audience tell at a glance what the key points are.', chinese: '组织良好的演讲可以让观众一目了然地知道要点是什么。' },
        { scenario: 'design', content: 'Good dashboard design lets users tell at a glance what needs attention.', chinese: '良好的仪表板设计可以让用户一眼就知道需要注意什么。' }
      ]},
      { id: 'C157', phrase: 'tell someone about', meaning: '告诉某人关于...', examples: [
        { scenario: 'daily', content: 'I can\'t wait to tell you about the amazing trip I just had.', chinese: '我迫不及待地想告诉你我刚刚经历的奇妙旅行。' },
        { scenario: 'daily', content: 'In my daily life, I can\'t wait to tell you about the amazing trip I just had.', chinese: '在我的日常生活中，我迫不及待地想告诉你我刚刚经历的奇妙旅行。' },
        { scenario: 'zju', content: 'I told my advisor about my new research idea and she seemed interested.', chinese: '我告诉我的导师我的新研究想法，她似乎很感兴趣。' },
        { scenario: 'design', content: 'We need to tell users about the new features in a clear and concise way.', chinese: '我们需要以清晰简洁的方式告诉用户新功能。' }
      ]},
      { id: 'C158', phrase: 'tell the reason', meaning: '说明原因 / 解释为什么', examples: [
        { scenario: 'daily', content: 'Please tell me the reason you were late today.', chinese: '请告诉我你今天迟到的原因。' },
        { scenario: 'daily', content: 'From my perspective, please tell me the reason you were late today.', chinese: '从我的角度来看，请告诉我你今天迟到的原因。' },
        { scenario: 'zju', content: 'In your introduction, tell the reader the reason you chose this research topic.', chinese: '在引言中，告诉读者你选择这个研究主题的原因。' },
        { scenario: 'design', content: 'We should tell users the reason why we need their location data.', chinese: '我们应该告诉用户我们需要他们的位置数据的原因。' }
      ]},
      { id: 'C159', phrase: 'tell in advance', meaning: '提前告知', examples: [
        { scenario: 'daily', content: 'Please tell me in advance if you can\'t make it to dinner.', chinese: '如果您不能参加晚餐，请提前告诉我。' },
        { scenario: 'daily', content: 'From my perspective, please tell me in advance if you can\'t make it to dinner.', chinese: '从我的角度来看，如果您不能参加晚餐，请提前告诉我。' },
        { scenario: 'zju', content: 'The professor asks students to tell her in advance if they miss a class.', chinese: '教授要求学生如果缺课请提前告诉她。' },
        { scenario: 'design', content: 'Good UX always tells users in advance about actions that can\'t be undone.', chinese: '良好的用户体验总是提前告诉用户无法撤消的操作。' }
      ]},
      { id: 'C160', phrase: 'tell by', meaning: '通过...判断 / 从...可以看出', examples: [
        { scenario: 'daily', content: 'You can tell by her voice that she\'s excited about the news.', chinese: '从她的声音中可以看出她对这个消息感到很兴奋。' },
        { scenario: 'daily', content: 'Honestly, you can tell by her voice that she\'s excited about the news.', chinese: '老实说，从她的声音中你可以看出她对这个消息很兴奋。' },
        { scenario: 'zju', content: 'You can tell by the quality of their references how deeply a student researched the topic.', chinese: '您可以通过参考文献的质量判断学生对该主题的研究有多深入。' },
        { scenario: 'design', content: 'You can tell by the bounce rate that users aren\'t finding what they need on this page.', chinese: '您可以通过跳出率判断用户在此页面上没有找到他们需要的内容。' }
      ]},
    ]
  },
  {
    id: 'V017', verb: 'Ask', meaning: '询问 / 请求 / 要求', frequencyRank: 17,
    collocations: [
      { id: 'C161', phrase: 'ask for help', meaning: '寻求帮助', examples: [
        { scenario: 'daily', content: 'Don\'t be afraid to ask for help when you need it.', chinese: '当您需要帮助时，不要害怕寻求帮助。' },
        { scenario: 'daily', content: 'Another habit I have is that don\'t be afraid to ask for help when you need it.', chinese: '我的另一个习惯是，当你需要帮助时，不要害怕寻求帮助。' },
        { scenario: 'zju', content: 'It\'s a sign of strength, not weakness, to ask for help in academic challenges.', chinese: '在学术挑战中寻求帮助是力量的表现，而不是软弱的表现。' },
        { scenario: 'design', content: 'Good designers ask for help when they are outside their area of expertise.', chinese: '优秀的设计师在超出自己的专业领域时会寻求帮助。' }
      ]},
      { id: 'C162', phrase: 'ask a question', meaning: '提问', examples: [
        { scenario: 'daily', content: 'If you\'re unsure, always ask a question rather than guessing.', chinese: '如果您不确定，请始终提出问题而不是猜测。' },
        { scenario: 'daily', content: 'always ask a question rather than guessing, If you\'re unsure.', chinese: '如果您不确定，请始终提出问题而不是猜测。' },
        { scenario: 'zju', content: 'I always try to ask at least one question during every lecture.', chinese: '我总是尝试在每一堂课中至少问一个问题。' },
        { scenario: 'design', content: 'In user interviews, asking the right question is more important than asking many questions.', chinese: '在用户访谈中，提出正确的问题比提出很多问题更重要。' }
      ]},
      { id: 'C163', phrase: 'ask for feedback', meaning: '请求反馈', examples: [
        { scenario: 'daily', content: 'I always ask for feedback after cooking a new dish for friends.', chinese: '在为朋友烹饪新菜后，我总是会征求反馈。' },
        { scenario: 'daily', content: 'In my daily life, I always ask for feedback after cooking a new dish for friends.', chinese: '在我的日常生活中，我总是在为朋友做一道新菜后询问反馈。' },
        { scenario: 'zju', content: 'Asking for feedback on your draft before the final submission is always a good idea.', chinese: '在最终提交之前征求对草稿的反馈总是一个好主意。' },
        { scenario: 'design', content: 'We asked for feedback from ten users before finalizing the prototype.', chinese: '在最终确定原型之前，我们征求了十位用户的反馈意见。' }
      ]},
      { id: 'C164', phrase: 'ask for advice', meaning: '寻求建议', examples: [
        { scenario: 'daily', content: 'I asked for advice from a financial advisor before investing.', chinese: '在投资之前，我征求了财务顾问的建议。' },
        { scenario: 'daily', content: 'In my daily life, I asked for advice from a financial advisor before investing.', chinese: '在日常生活中，我在投资前会向财务顾问寻求建议。' },
        { scenario: 'zju', content: 'When you\'re unsure about your thesis direction, ask for advice from your supervisor.', chinese: '当您不确定论文方向时，请向导师寻求建议。' },
        { scenario: 'design', content: 'I asked for advice from experienced designers when I was stuck on the problem.', chinese: '当我遇到问题时，我向经验丰富的设计师寻求建议。' }
      ]},
      { id: 'C165', phrase: 'ask oneself', meaning: '自问 / 反思', examples: [
        { scenario: 'daily', content: 'Ask yourself whether this decision aligns with your long-term goals.', chinese: '问问自己这个决定是否符合您的长期目标。' },
        { scenario: 'daily', content: 'From my perspective, ask yourself whether this decision aligns with your long-term goals.', chinese: '从我的角度来看，问问自己这个决定是否符合您的长期目标。' },
        { scenario: 'zju', content: 'Before starting your research, ask yourself what problem you are actually trying to solve.', chinese: '在开始研究之前，问问自己您实际上想解决什么问题。' },
        { scenario: 'design', content: 'Before adding a feature, always ask yourself: does this serve the user?', chinese: '在添加功能之前，请始终问自己：这是否为用户服务？' }
      ]},
      { id: 'C166', phrase: 'ask for permission', meaning: '请求许可', examples: [
        { scenario: 'daily', content: 'Always ask for permission before sharing someone else\'s photos online.', chinese: '在网上分享他人的照片之前，请务必先征求许可。' },
        { scenario: 'daily', content: 'From my perspective, always ask for permission before sharing someone else\'s photos online.', chinese: '从我的角度来看，在网上分享别人的照片之前一定要征求许可。' },
        { scenario: 'zju', content: 'You need to ask for permission before using copyrighted material in your paper.', chinese: '在论文中使用受版权保护的材料之前，您需要征求许可。' },
        { scenario: 'design', content: 'The app should ask for permission in context, not all at once during onboarding.', chinese: '应用程序应在上下文中请求许可，而不是在入门期间一次性请求所有许可。' }
      ]},
      { id: 'C167', phrase: 'ask for clarification', meaning: '请求澄清 / 要求说明', examples: [
        { scenario: 'daily', content: 'If you don\'t understand the instructions, ask for clarification.', chinese: '如果您不明白说明，请要求澄清。' },
        { scenario: 'daily', content: 'ask for clarification, If you don\'t understand the instructions.', chinese: '如果您不理解说明，请要求澄清。' },
        { scenario: 'zju', content: 'It\'s okay to ask for clarification during a lecture if something is unclear.', chinese: '如果有不清楚的地方，可以在讲座期间要求澄清。' },
        { scenario: 'design', content: 'Before starting a project, ask for clarification on the requirements from the client.', chinese: '在开始项目之前，请询问客户的要求。' }
      ]},
      { id: 'C168', phrase: 'ask the right questions', meaning: '问对问题', examples: [
        { scenario: 'daily', content: 'Asking the right questions helps you get useful answers when traveling.', chinese: '提出正确的问题可以帮助您在旅行时获得有用的答案。' },
        { scenario: 'daily', content: 'From my perspective, asking the right questions helps you get useful answers when traveling.', chinese: '从我的角度来看，提出正确的问题可以帮助您在旅行时获得有用的答案。' },
        { scenario: 'zju', content: 'The key to great research is asking the right questions from the start.', chinese: '伟大研究的关键是从一开始就提出正确的问题。' },
        { scenario: 'design', content: 'Effective user interviews depend on asking the right questions in the right order.', chinese: '有效的用户访谈取决于以正确的顺序提出正确的问题。' }
      ]},
      { id: 'C169', phrase: 'ask in advance', meaning: '提前询问', examples: [
        { scenario: 'daily', content: 'Ask in advance whether there\'s a dress code for the event.', chinese: '提前询问活动是否有着装要求。' },
        { scenario: 'daily', content: 'From my perspective, ask in advance whether there\'s a dress code for the event.', chinese: '从我的角度来看，提前询问活动是否有着装要求。' },
        { scenario: 'zju', content: 'Ask in advance if the lab equipment will be available for your experiment.', chinese: '提前询问实验室设备是否可用于您的实验。' },
        { scenario: 'design', content: 'We should ask in advance how much technical knowledge our users have.', chinese: '我们应该提前询问我们的用户拥有多少技术知识。' }
      ]},
      { id: 'C170', phrase: 'ask for support', meaning: '寻求支持', examples: [
        { scenario: 'daily', content: 'It takes courage to ask for support when you\'re going through a hard time.', chinese: '当你遇到困难时寻求支持需要勇气。' },
        { scenario: 'daily', content: 'From my perspective, it takes courage to ask for support when you\'re going through a hard time.', chinese: '在我看来，当你经历困难时期时寻求支持需要勇气。' },
        { scenario: 'zju', content: 'Students can ask for support from the mental health center on campus.', chinese: '学生可以向校园心理健康中心寻求支持。' },
        { scenario: 'design', content: 'The team asked for support from the engineering department for the technical challenges.', chinese: '该团队请求工程部门支持解决技术挑战。' }
      ]},
    ]
  },
  {
    id: 'V018', verb: 'Work', meaning: '工作 / 运作 / 努力', frequencyRank: 18,
    collocations: [
      { id: 'C171', phrase: 'work on', meaning: '致力于 / 努力改进', examples: [
        { scenario: 'daily', content: 'I\'m currently working on improving my public speaking skills.', chinese: '我目前正在努力提高我的公开演讲技巧。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'m currently working on improving my public speaking skills.', chinese: '我的另一个习惯是我目前正在努力提高我的公开演讲技巧。' },
        { scenario: 'zju', content: 'We are working on a joint research project with two other universities.', chinese: '我们正在与另外两所大学开展一个联合研究项目。' },
        { scenario: 'design', content: 'The team is working on a new iteration based on the latest user feedback.', chinese: '该团队正在根据最新的用户反馈进行新的迭代。' }
      ]},
      { id: 'C172', phrase: 'work out', meaning: '解决 / 锻炼 / 算出', examples: [
        { scenario: 'daily', content: 'Everything worked out in the end, even though it was stressful.', chinese: '尽管压力很大，但最终一切都顺利了。' },
        { scenario: 'daily', content: 'even though it was stressful, Everything worked out in the end.', chinese: '虽然压力很大，但最后一切都顺利了。' },
        { scenario: 'zju', content: 'We need to work out the details of the experiment before submitting the proposal.', chinese: '在提交提案之前我们需要确定实验的细节。' },
        { scenario: 'design', content: 'It took several sessions to work out a user flow that everyone agreed on.', chinese: '经过几次会议才制定出每个人都同意的用户流程。' }
      ]},
      { id: 'C173', phrase: 'work together', meaning: '合作 / 共同努力', examples: [
        { scenario: 'daily', content: 'If we work together, we can finish the project much faster.', chinese: '如果我们共同努力，我们就能更快地完成这个项目。' },
        { scenario: 'daily', content: 'we can finish the project much faster, If we work together.', chinese: '如果我们共同努力，我们可以更快地完成该项目。' },
        { scenario: 'zju', content: 'Students from different disciplines work together on interdisciplinary projects.', chinese: '来自不同学科的学生一起从事跨学科项目。' },
        { scenario: 'design', content: 'The design and engineering teams work together throughout the entire process.', chinese: '设计和工程团队在整个过程中共同努力。' }
      ]},
      { id: 'C174', phrase: 'work toward', meaning: '朝...努力', examples: [
        { scenario: 'daily', content: 'I\'m working toward saving enough money to study abroad.', chinese: '我正在努力攒足够的钱出国留学。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'m working toward saving enough money to study abroad.', chinese: '我的另一个习惯是努力攒足够的钱出国留学。' },
        { scenario: 'zju', content: 'All our research is working toward finding a more sustainable energy source.', chinese: '我们所有的研究都致力于寻找更可持续的能源。' },
        { scenario: 'design', content: 'Every design decision should work toward improving the user experience.', chinese: '每个设计决策都应该致力于改善用户体验。' }
      ]},
      { id: 'C175', phrase: 'work hard', meaning: '努力工作 / 勤奋', examples: [
        { scenario: 'daily', content: 'If you work hard and stay consistent, results will come.', chinese: '如果你努力工作并保持一致，结果就会到来。' },
        { scenario: 'daily', content: 'results will come, If you work hard and stay consistent.', chinese: '如果你努力工作并保持一致，结果就会到来。' },
        { scenario: 'zju', content: 'ZJU students are known for working hard and having high academic standards.', chinese: '浙江大学的学生以勤奋和高学术水平而闻名。' },
        { scenario: 'design', content: 'Even talented designers need to work hard and stay curious throughout their career.', chinese: '即使是有才华的设计师也需要在整个职业生涯中努力工作并保持好奇心。' }
      ]},
      { id: 'C176', phrase: 'work independently', meaning: '独立工作', examples: [
        { scenario: 'daily', content: 'I prefer to work independently because I can focus better on my own.', chinese: '我更喜欢独立工作，因为我可以更好地专注于自己。' },
        { scenario: 'daily', content: 'In my daily life, I prefer to work independently because I can focus better on my own.', chinese: '在日常生活中，我更喜欢独立工作，因为我可以更好地专注于自己。' },
        { scenario: 'zju', content: 'Ph.D. students are expected to work independently with minimal guidance.', chinese: '博士学生应该在最少的指导下独立工作。' },
        { scenario: 'design', content: 'Freelance designers must be able to work independently and manage their own time.', chinese: '自由设计师必须能够独立工作并管理自己的时间。' }
      ]},
      { id: 'C177', phrase: 'work effectively', meaning: '高效工作', examples: [
        { scenario: 'daily', content: 'A good workspace setup helps me work effectively from home.', chinese: '良好的工作空间设置可以帮助我在家有效地工作。' },
        { scenario: 'daily', content: 'Another habit I have is that a good workspace setup helps me work effectively from home.', chinese: '我的另一个习惯是良好的工作空间设置可以帮助我在家有效地工作。' },
        { scenario: 'zju', content: 'Working effectively in a group requires clear roles and open communication.', chinese: '在团队中有效地工作需要明确的角色和开放的沟通。' },
        { scenario: 'design', content: 'Design systems help teams work effectively by providing reusable components.', chinese: '设计系统通过提供可重复使用的组件来帮助团队有效地工作。' }
      ]},
      { id: 'C178', phrase: 'work under pressure', meaning: '在压力下工作', examples: [
        { scenario: 'daily', content: 'I\'ve learned to work under pressure and still produce quality results.', chinese: '我学会了在压力下工作并仍然取得高质量的成果。' },
        { scenario: 'daily', content: 'Another habit I have is that i\'ve learned to work under pressure and still produce quality results.', chinese: '我的另一个习惯是我学会了在压力下工作并仍然产生高质量的结果。' },
        { scenario: 'zju', content: 'Exam season trains you to work under pressure and prioritize quickly.', chinese: '考试季节训练您在压力下工作并快速确定优先顺序。' },
        { scenario: 'design', content: 'In an agency, you often have to work under pressure to meet tight client deadlines.', chinese: '在代理机构中，您经常必须在压力下工作才能满足客户紧迫的期限。' }
      ]},
      { id: 'C179', phrase: 'work out a solution', meaning: '想出解决方案', examples: [
        { scenario: 'daily', content: 'We sat down and worked out a solution that everyone could agree on.', chinese: '我们坐下来制定了一个每个人都能同意的解决方案。' },
        { scenario: 'daily', content: 'At home, we sat down and worked out a solution that everyone could agree on.', chinese: '在家里，我们坐下来制定了一个每个人都同意的解决方案。' },
        { scenario: 'zju', content: 'The research team worked out a solution to the data inconsistency problem.', chinese: '研究团队针对数据不一致问题找到了解决方案。' },
        { scenario: 'design', content: 'After three rounds of feedback, we finally worked out a solution for the navigation issue.', chinese: '经过三轮反馈，我们终于找到了导航问题的解决方案。' }
      ]},
      { id: 'C180', phrase: 'work from home', meaning: '在家工作', examples: [
        { scenario: 'daily', content: 'Working from home requires a lot of self-discipline.', chinese: '在家工作需要大量的自律。' },
        { scenario: 'daily', content: 'From my perspective, working from home requires a lot of self-discipline.', chinese: '在我看来，在家工作需要大量的自律。' },
        { scenario: 'zju', content: 'During the pandemic, many ZJU students had to study and work from home.', chinese: '疫情期间，不少浙大学生不得不在家学习和工作。' },
        { scenario: 'design', content: 'Many design teams now work from home using digital collaboration tools.', chinese: '许多设计团队现在使用数字协作工具在家工作。' }
      ]},
    ]
  },
  {
    id: 'V019', verb: 'Feel', meaning: '感觉 / 感到', frequencyRank: 19,
    collocations: [
      { id: 'C181', phrase: 'feel confident', meaning: '感到自信', examples: [
        { scenario: 'daily', content: 'I feel confident when I\'m well prepared for a presentation.', chinese: '当我为演讲做好充分准备时，我会感到自信。' },
        { scenario: 'daily', content: 'In my daily life, I feel confident when I\'m well prepared for a presentation.', chinese: '在日常生活中，当我为演讲做好充分准备时，我会感到自信。' },
        { scenario: 'zju', content: 'After practice, I started to feel confident speaking English in class.', chinese: '经过练习，我开始有信心在课堂上说英语。' },
        { scenario: 'design', content: 'A consistent design system helps the team feel confident about their decisions.', chinese: '一致的设计系统可以帮助团队对他们的决策充满信心。' }
      ]},
      { id: 'C182', phrase: 'feel comfortable', meaning: '感到舒适 / 觉得自在', examples: [
        { scenario: 'daily', content: 'I finally feel comfortable in my new apartment after a month.', chinese: '一个月后我终于在新公寓感到舒服了。' },
        { scenario: 'daily', content: 'In my daily life, I finally feel comfortable in my new apartment after a month.', chinese: '日常生活中，一个月后我终于在新公寓感到舒服了。' },
        { scenario: 'zju', content: 'It took me a semester to feel comfortable asking questions in class.', chinese: '我花了一个学期才能够在课堂上轻松提问。' },
        { scenario: 'design', content: 'Users need to feel comfortable sharing their data with the app.', chinese: '用户需要放心地与应用程序共享他们的数据。' }
      ]},
      { id: 'C183', phrase: 'feel the pressure', meaning: '感受到压力', examples: [
        { scenario: 'daily', content: 'I feel the pressure to meet everyone\'s expectations sometimes.', chinese: '有时我会感到满足每个人的期望的压力。' },
        { scenario: 'daily', content: 'In my daily life, I feel the pressure to meet everyone\'s expectations sometimes.', chinese: '在日常生活中，有时我会感受到满足大家期望的压力。' },
        { scenario: 'zju', content: 'Many students feel the pressure of balancing academics and personal life at ZJU.', chinese: '在浙江大学，许多学生感受到平衡学业和个人生活的压力。' },
        { scenario: 'design', content: 'The team felt the pressure when the client moved the deadline up by a week.', chinese: '当客户将截止日期提前一周时，团队感受到了压力。' }
      ]},
      { id: 'C184', phrase: 'feel motivated', meaning: '感到有动力', examples: [
        { scenario: 'daily', content: 'I feel motivated when I can see clear progress toward my goal.', chinese: '当我看到实现目标的明显进展时，我会感到动力十足。' },
        { scenario: 'daily', content: 'In my daily life, I feel motivated when I can see clear progress toward my goal.', chinese: '在日常生活中，当我看到目标取得明显进展时，我就会感到动力十足。' },
        { scenario: 'zju', content: 'Joining a study group makes me feel more motivated to prepare for class.', chinese: '加入学习小组让我更有动力准备上课。' },
        { scenario: 'design', content: 'Designers feel more motivated when they understand the impact of their work on users.', chinese: '当设计师了解自己的工作对用户的影响时，他们会更有动力。' }
      ]},
      { id: 'C185', phrase: 'feel stuck', meaning: '感到卡住了 / 陷入困境', examples: [
        { scenario: 'daily', content: 'Sometimes I feel stuck in a routine and need a change.', chinese: '有时我觉得自己陷入了常规，需要改变。' },
        { scenario: 'daily', content: 'From my perspective, sometimes I feel stuck in a routine and need a change.', chinese: '从我的角度来看，有时我觉得自己陷入了常规，需要改变。' },
        { scenario: 'zju', content: 'When I feel stuck on a problem, I take a break and come back with fresh eyes.', chinese: '当我遇到问题时，我会休息一下，然后以全新的眼光回来。' },
        { scenario: 'design', content: 'It\'s normal to feel stuck in the middle of a design project.', chinese: '在设计项目中感到陷入困境是很正常的。' }
      ]},
      { id: 'C186', phrase: 'feel the difference', meaning: '感受到差异 / 发现不同', examples: [
        { scenario: 'daily', content: 'After one month of exercise, I started to feel the difference.', chinese: '经过一个月的锻炼，我开始感觉到了不同。' },
        { scenario: 'daily', content: 'I started to feel the difference, After one month of exercise.', chinese: '经过一个月的锻炼，我开始感觉到不同。' },
        { scenario: 'zju', content: 'After applying the feedback from my advisor, I could feel the difference in the quality of my writing.', chinese: '在应用了导师的反馈后，我可以感觉到我的写作质量有所不同。' },
        { scenario: 'design', content: 'After the redesign, users could immediately feel the difference in usability.', chinese: '重新设计后，用户可以立即感受到可用性的差异。' }
      ]},
      { id: 'C187', phrase: 'feel passionate about', meaning: '对...充满热情', examples: [
        { scenario: 'daily', content: 'I feel passionate about environmental issues and want to make a change.', chinese: '我对环境问题充满热情并希望做出改变。' },
        { scenario: 'daily', content: 'In my daily life, I feel passionate about environmental issues and want to make a change.', chinese: '在日常生活中，我对环境问题充满热情并希望做出改变。' },
        { scenario: 'zju', content: 'Choose a thesis topic you feel passionate about—it will sustain you through the hard parts.', chinese: '选择一个你感兴趣的论文主题——它将支撑你度过困难的部分。' },
        { scenario: 'design', content: 'The best designers feel passionate about solving real problems for real people.', chinese: '最好的设计师热衷于为现实的人们解决实际问题。' }
      ]},
      { id: 'C188', phrase: 'feel responsible', meaning: '感到有责任', examples: [
        { scenario: 'daily', content: 'I feel responsible for the wellbeing of the people who depend on me.', chinese: '我对依赖我的人们的福祉负有责任。' },
        { scenario: 'daily', content: 'In my daily life, I feel responsible for the wellbeing of the people who depend on me.', chinese: '在日常生活中，我对依赖我的人们的福祉负有责任。' },
        { scenario: 'zju', content: 'As the team leader, I feel responsible for everyone\'s performance in the project.', chinese: '作为团队领导，我对每个人在项目中的表现负有责任。' },
        { scenario: 'design', content: 'Designers should feel responsible for the accessibility and inclusivity of their products.', chinese: '设计师应该对其产品的可访问性和包容性负责。' }
      ]},
      { id: 'C189', phrase: 'feel inspired', meaning: '感到受到启发', examples: [
        { scenario: 'daily', content: 'I feel inspired every time I visit an art museum.', chinese: '每次参观艺术博物馆我都会受到启发。' },
        { scenario: 'daily', content: 'In my daily life, I feel inspired every time I visit an art museum.', chinese: '在日常生活中，每次参观美术馆，我都会受到启发。' },
        { scenario: 'zju', content: 'I left the lecture feeling inspired to explore a completely new research direction.', chinese: '听完讲座后，我受到启发，想要探索一个全新的研究方向。' },
        { scenario: 'design', content: 'Visiting a design exhibition always makes me feel inspired and energized.', chinese: '参观设计展览总是让我感到灵感和活力。' }
      ]},
      { id: 'C190', phrase: 'feel accomplished', meaning: '感到有成就感', examples: [
        { scenario: 'daily', content: 'I feel accomplished when I finish a long book or challenging project.', chinese: '当我完成一本长书或具有挑战性的项目时，我会感到很有成就感。' },
        { scenario: 'daily', content: 'In my daily life, I feel accomplished when I finish a long book or challenging project.', chinese: '在日常生活中，当我完成一本长书或具有挑战性的项目时，我会感到很有成就感。' },
        { scenario: 'zju', content: 'Submitting my thesis made me feel accomplished in a way nothing else had before.', chinese: '提交论文让我感到前所未有的成就感。' },
        { scenario: 'design', content: 'Seeing a product you designed being used by real people makes you feel accomplished.', chinese: '看到你设计的产品被真人使用会让你感到很有成就感。' }
      ]},
    ]
  },
  {
    id: 'V020', verb: 'Need', meaning: '需要 / 必须', frequencyRank: 20,
    collocations: [
      { id: 'C191', phrase: 'need to improve', meaning: '需要改进 / 有提升空间', examples: [
        { scenario: 'daily', content: 'I know I need to improve my listening skills in Chinese.', chinese: '我知道我需要提高我的中文听力能力。' },
        { scenario: 'daily', content: 'In my daily life, I know I need to improve my listening skills in Chinese.', chinese: '在日常生活中，我知道我需要提高我的中文听力能力。' },
        { scenario: 'zju', content: 'My professor told me I need to improve the methodology section of my thesis.', chinese: '我的教授告诉我，我需要改进论文的方法论部分。' },
        { scenario: 'design', content: 'The feedback showed us that we need to improve the onboarding experience.', chinese: '反馈表明我们需要改善入职体验。' }
      ]},
      { id: 'C192', phrase: 'need more time', meaning: '需要更多时间', examples: [
        { scenario: 'daily', content: 'I need more time to think about this decision carefully.', chinese: '我需要更多的时间来仔细考虑这个决定。' },
        { scenario: 'daily', content: 'In my daily life, I need more time to think about this decision carefully.', chinese: '在日常生活中，我需要更多的时间来仔细思考这个决定。' },
        { scenario: 'zju', content: 'I need more time to review all the reading materials before the seminar.', chinese: '我需要更多时间在研讨会之前复习所有阅读材料。' },
        { scenario: 'design', content: 'Complex design problems need more time than clients usually expect.', chinese: '复杂的设计问题需要比客户通常预期更多的时间。' }
      ]},
      { id: 'C193', phrase: 'need to consider', meaning: '需要考虑', examples: [
        { scenario: 'daily', content: 'We need to consider all the options before making a final choice.', chinese: '在做出最终选择之前，我们需要考虑所有的选择。' },
        { scenario: 'daily', content: 'At home, we need to consider all the options before making a final choice.', chinese: '在家里，我们需要考虑所有的选择，然后再做出最终的选择。' },
        { scenario: 'zju', content: 'The research team needs to consider the ethical implications of the study.', chinese: '研究团队需要考虑该研究的伦理影响。' },
        { scenario: 'design', content: 'We need to consider how this design will work on different screen sizes.', chinese: '我们需要考虑这种设计如何在不同的屏幕尺寸上工作。' }
      ]},
      { id: 'C194', phrase: 'need help', meaning: '需要帮助', examples: [
        { scenario: 'daily', content: 'If you need help, don\'t hesitate to ask—that\'s what I\'m here for.', chinese: '如果您需要帮助，请毫不犹豫地提出——这就是我来这里的目的。' },
        { scenario: 'daily', content: 'don\'t hesitate to ask—that\'s what I\'m here for, If you need help.', chinese: '如果您需要帮助，请毫不犹豫地询问——这就是我来这里的目的。' },
        { scenario: 'zju', content: 'Many first-year students need help adjusting to university life.', chinese: '许多一年级学生需要帮助来适应大学生活。' },
        { scenario: 'design', content: 'If users need help too often, it signals a design problem, not a user problem.', chinese: '如果用户过于频繁地需要帮助，则表明存在设计问题，而不是用户问题。' }
      ]},
      { id: 'C195', phrase: 'need to focus', meaning: '需要专注', examples: [
        { scenario: 'daily', content: 'I need to focus on one task at a time to do my best work.', chinese: '我需要一次专注于一项任务才能做到最好。' },
        { scenario: 'daily', content: 'In my daily life, I need to focus on one task at a time to do my best work.', chinese: '在日常生活中，我需要一次专注于一项任务，才能做到最好。' },
        { scenario: 'zju', content: 'During exam week, you need to focus and avoid unnecessary distractions.', chinese: '考试周期间，您需要集中注意力，避免不必要的干扰。' },
        { scenario: 'design', content: 'We need to focus on the core user journey before adding extra features.', chinese: '在添加额外功能之前，我们需要关注核心用户旅程。' }
      ]},
      { id: 'C196', phrase: 'need to balance', meaning: '需要平衡', examples: [
        { scenario: 'daily', content: 'You need to balance work and rest to avoid burnout.', chinese: '您需要平衡工作和休息，以避免倦怠。' },
        { scenario: 'daily', content: 'Honestly, you need to balance work and rest to avoid burnout.', chinese: '老实说，你需要平衡工作和休息，以避免倦怠。' },
        { scenario: 'zju', content: 'Students at ZJU need to balance academic demands with personal wellbeing.', chinese: '浙江大学的学生需要平衡学业需求和个人福祉。' },
        { scenario: 'design', content: 'We need to balance innovation with usability in this redesign.', chinese: '在这次重新设计中，我们需要平衡创新和可用性。' }
      ]},
      { id: 'C197', phrase: 'need practice', meaning: '需要练习', examples: [
        { scenario: 'daily', content: 'Playing piano well needs practice—there\'s no shortcut.', chinese: '弹好钢琴需要练习——没有捷径。' },
        { scenario: 'daily', content: 'From my perspective, playing piano well needs practice—there\'s no shortcut.', chinese: '在我看来，弹好钢琴需要练习，没有捷径。' },
        { scenario: 'zju', content: 'Speaking in public needs practice, but it gets easier over time.', chinese: '在公共场合演讲需要练习，但随着时间的推移会变得更容易。' },
        { scenario: 'design', content: 'Sketching ideas quickly is a skill that needs practice to develop.', chinese: '快速描绘想法是一项需要练习才能培养的技能。' }
      ]},
      { id: 'C198', phrase: 'need to communicate', meaning: '需要沟通', examples: [
        { scenario: 'daily', content: 'In any relationship, you need to communicate openly and honestly.', chinese: '在任何关系中，你都需要开诚布公地沟通。' },
        { scenario: 'daily', content: 'you need to communicate openly and honestly, In any relationship.', chinese: '在任何关系中，你都需要开诚布公地沟通。' },
        { scenario: 'zju', content: 'Group project members need to communicate regularly to stay aligned.', chinese: '小组项目成员需要定期沟通以保持一致。' },
        { scenario: 'design', content: 'Designers need to communicate their ideas clearly to developers and clients.', chinese: '设计师需要向开发人员和客户清楚地传达他们的想法。' }
      ]},
      { id: 'C199', phrase: 'need to develop', meaning: '需要发展 / 需要培养', examples: [
        { scenario: 'daily', content: 'We all need to develop better habits for long-term success.', chinese: '为了长期的成功，我们都需要养成更好的习惯。' },
        { scenario: 'daily', content: 'At home, we all need to develop better habits for long-term success.', chinese: '在家里，我们都需要养成更好的习惯才能取得长期成功。' },
        { scenario: 'zju', content: 'ZJU students need to develop both technical and soft skills to be competitive.', chinese: '浙江大学的学生需要发展技术和软技能才能具有竞争力。' },
        { scenario: 'design', content: 'The company needs to develop a stronger design culture at the leadership level.', chinese: '公司需要在领导层培养更强大的设计文化。' }
      ]},
      { id: 'C200', phrase: 'need clarification', meaning: '需要澄清 / 需要说明', examples: [
        { scenario: 'daily', content: 'I need clarification on the timeline before I can commit to anything.', chinese: '在我做出任何承诺之前，我需要澄清时间表。' },
        { scenario: 'daily', content: 'In my daily life, I need clarification on the timeline before I can commit to anything.', chinese: '在我的日常生活中，我需要先澄清时间表，然后才能做出任何事情。' },
        { scenario: 'zju', content: 'Students need clarification from the professor on the grading rubric.', chinese: '学生需要教授对评分标准进行澄清。' },
        { scenario: 'design', content: 'The design brief needs clarification before the team can begin any work.', chinese: '在团队开始任何工作之前，需要澄清设计概要。' }
      ]},
    ]
  },
];

export const IELTS_QUESTIONS = [
  { id: 'Q001', part: 1, topic: 'Daily Routine', question: 'Describe your daily routine and explain which part of your day you find most challenging.' },
  { id: 'Q002', part: 1, topic: 'Hobbies', question: 'What hobbies do you have, and how did you get started with them?' },
  { id: 'Q003', part: 1, topic: 'Study', question: 'How do you usually prepare for exams or important tasks at university?' },
  { id: 'Q004', part: 2, topic: 'A Person You Admire', question: 'Describe a person you admire. You should say: who this person is, how you know them, and explain why you admire them.' },
  { id: 'Q005', part: 2, topic: 'A Challenge You Overcame', question: 'Describe a challenge you have faced and how you dealt with it.' },
  { id: 'Q006', part: 2, topic: 'A Skill You Want to Learn', question: 'Describe a skill you would like to learn. You should say what it is, why you want to learn it, and how you plan to learn it.' },
  { id: 'Q007', part: 3, topic: 'Technology', question: 'Do you think technology has made communication better or worse? Give reasons for your opinion.' },
  { id: 'Q008', part: 3, topic: 'Education', question: 'How important is it for students to develop problem-solving skills in education?' },
  { id: 'Q009', part: 1, topic: 'Travel', question: 'Do you enjoy traveling? Where is somewhere you would like to go and why?' },
  { id: 'Q010', part: 2, topic: 'An Interesting Place', question: 'Describe an interesting place you have visited. Talk about where it is, why you went there, and what you found most interesting about it.' },
];

export function getVerbById(id: string): Verb | undefined {
  return VERBS.find(v => v.id === id);
}

export function getCollocationById(colId: string): { verb: Verb; collocation: Collocation } | undefined {
  for (const verb of VERBS) {
    const col = verb.collocations.find(c => c.id === colId);
    if (col) return { verb, collocation: col };
  }
  return undefined;
}

/** 仅返回母语者日常使用的搭配（剔除书面语） */
export function getDailyCollocations(): Array<{ verb: Verb; collocation: Collocation }> {
  const result: Array<{ verb: Verb; collocation: Collocation }> = [];
  for (const verb of VERBS) {
    for (const col of verb.collocations) {
      if (col.usage !== 'written') result.push({ verb, collocation: col });
    }
  }
  return result;
}

export function getAllCollocations(): Array<{ verb: Verb; collocation: Collocation }> {
  const result: Array<{ verb: Verb; collocation: Collocation }> = [];
  for (const verb of VERBS) {
    for (const col of verb.collocations) {
      result.push({ verb, collocation: col });
    }
  }
  return result;
}

/** 实验室内置库搜索搭配，无需去资产区选词 */
export function searchCollocations(query: string, limit = 12): Array<{ verb: Verb; collocation: Collocation }> {
  const t = query.trim().toLowerCase();
  if (!t) return [];
  const all = getAllCollocations();
  const scored: Array<{ row: { verb: Verb; collocation: Collocation }; score: number }> = [];
  for (const row of all) {
    const ph = row.collocation.phrase.toLowerCase();
    const me = row.collocation.meaning.toLowerCase();
    let score = 0;
    if (ph === t) score = 100;
    else if (ph.startsWith(t)) score = 80;
    else if (ph.includes(t)) score = 60;
    else if (me.includes(t)) score = 35;
    else continue;
    scored.push({ row, score });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.row.collocation.phrase.localeCompare(b.row.collocation.phrase);
  });
  return scored.slice(0, limit).map(s => s.row);
}

/** 为搭配随机匹配一个 IELTS 主题语境，便于覆盖雅思考题 */
export function getIELTSContextForPhrase(phrase: string): string {
  const theme = IELTS_THEMES[Math.floor(Math.random() * IELTS_THEMES.length)];
  return `在「${theme}」主题下，用搭配 "${phrase}" 造一个完整的英文句子（母语者日常会说的说法）`;
}
