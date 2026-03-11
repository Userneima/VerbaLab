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
        { scenario: 'zju', content: 'I need to get up early to catch the first bus to the ZJU campus.' },
        { scenario: 'zju', content: 'On exam days, most students get up earlier than usual to review notes.' },
        { scenario: 'design', content: 'Sometimes I get up from my desk to sketch ideas on the whiteboard.' },
        { scenario: 'design', content: 'I always get up and walk around the studio when I need fresh inspiration.' },
      ]},
      { id: 'C002', phrase: 'get started', meaning: '开始 / 入手', examples: [
        { scenario: 'daily', content: 'Let\'s get started on the cleaning before guests arrive.', chinese: '客人到之前咱们先把打扫搞起来。' },
        { scenario: 'daily', content: 'Once you get started on a good book, it\'s hard to put it down.', chinese: '一本好书一旦开始读，就很难放下。' },
        { scenario: 'zju', content: 'We need to get started on the group project this week.' },
        { scenario: 'zju', content: 'The professor said we should get started on our thesis proposals early.' },
        { scenario: 'design', content: 'Before we get started, let\'s review the design brief again.' },
        { scenario: 'design', content: 'It\'s important to get started with user research before jumping into wireframes.' },
      ]},
      { id: 'C003', phrase: 'get better', meaning: '变好 / 进步', examples: [
        { scenario: 'daily', content: 'My cooking gets better every time I try a new recipe.' },
        { scenario: 'daily', content: 'Things will get better once you start exercising regularly.' },
        { scenario: 'zju', content: 'My English gets better every time I practice with classmates.' },
        { scenario: 'zju', content: 'Your presentation skills will get better with more practice.' },
        { scenario: 'design', content: 'The prototype gets better after each round of user testing.' },
        { scenario: 'design', content: 'Our color palette got better once we consulted accessibility guidelines.' },
      ]},
      { id: 'C004', phrase: 'get in touch', meaning: '取得联系', examples: [
        { scenario: 'daily', content: 'I\'ll get in touch with you once I have more information.' },
        { scenario: 'daily', content: 'We should get in touch with old friends more often.' },
        { scenario: 'zju', content: 'Please get in touch with the professor before the deadline.' },
        { scenario: 'zju', content: 'I got in touch with the teaching assistant about the assignment requirements.' },
        { scenario: 'design', content: 'We need to get in touch with the client to confirm the requirements.' },
        { scenario: 'design', content: 'The PM got in touch with the dev team to discuss feasibility.' },
      ]},
      { id: 'C005', phrase: 'get along', meaning: '相处融洽', examples: [
        { scenario: 'daily', content: 'My roommates and I get along really well.' },
        { scenario: 'daily', content: 'It\'s important to get along with your neighbors in an apartment building.' },
        { scenario: 'zju', content: 'It\'s important to get along with your lab partners on long projects.' },
        { scenario: 'zju', content: 'International and local students get along better through group activities.' },
        { scenario: 'design', content: 'Good designers get along with engineers and understand their constraints.' },
        { scenario: 'design', content: 'Our team gets along well because we respect each other\'s expertise.' },
      ]},
      { id: 'C006', phrase: 'get rid of', meaning: '摆脱 / 去除', examples: [
        { scenario: 'daily', content: 'I need to get rid of all the unnecessary stuff in my room.' },
        { scenario: 'daily', content: 'She wants to get rid of her old habits and develop healthier ones.' },
        { scenario: 'zju', content: 'We should get rid of the parts of the report that are not relevant.' },
        { scenario: 'zju', content: 'The library got rid of outdated textbooks to make room for new editions.' },
        { scenario: 'design', content: 'We need to get rid of the features that confuse users.' },
        { scenario: 'design', content: 'Getting rid of visual clutter dramatically improved the overall design.' },
      ]},
      { id: 'C007', phrase: 'get used to', meaning: '习惯 / 适应', examples: [
        { scenario: 'daily', content: 'It takes time to get used to a new city.' },
        { scenario: 'daily', content: 'I\'m gradually getting used to cooking for myself.' },
        { scenario: 'zju', content: 'It took me a semester to get used to the fast pace of ZJU courses.' },
        { scenario: 'zju', content: 'New exchange students need time to get used to the campus layout.' },
        { scenario: 'design', content: 'New team members need time to get used to our design process.' },
        { scenario: 'design', content: 'Users may take a while to get used to the new interface layout.' },
      ]},
      { id: 'C008', phrase: 'get stuck', meaning: '卡住 / 遇到困难', examples: [
        { scenario: 'daily', content: 'I got stuck in traffic for over an hour this morning.' },
        { scenario: 'daily', content: 'Don\'t get stuck on small details—focus on the big picture.' },
        { scenario: 'zju', content: 'I always get stuck on the math part of the exam.' },
        { scenario: 'zju', content: 'If you get stuck on a problem, ask your study group for help.' },
        { scenario: 'design', content: 'Sometimes I get stuck when trying to balance aesthetics and function.' },
        { scenario: 'design', content: 'We got stuck on the layout until we tried a completely different approach.' },
      ]},
      { id: 'C009', phrase: 'get back', meaning: '回来 / 恢复 / 回复', examples: [
        { scenario: 'daily', content: 'I\'ll get back to you as soon as I check my schedule.' },
        { scenario: 'daily', content: 'After the long vacation, it\'s tough to get back into a routine.' },
        { scenario: 'zju', content: 'After the holiday, it\'s hard to get back into study mode.' },
        { scenario: 'zju', content: 'The professor promised to get back to us with grades by Friday.' },
        { scenario: 'design', content: 'Let me get back to you after I review the design files.' },
        { scenario: 'design', content: 'We decided to get back to the original concept after testing showed better results.' },
      ]},
      { id: 'C010', phrase: 'get a chance', meaning: '获得机会', examples: [
        { scenario: 'daily', content: 'I finally got a chance to visit that famous restaurant downtown.' },
        { scenario: 'daily', content: 'If you get a chance, you should really try that new coffee shop.' },
        { scenario: 'zju', content: 'Not everyone gets a chance to present in front of the whole class.' },
        { scenario: 'zju', content: 'I hope to get a chance to study abroad next semester.' },
        { scenario: 'design', content: 'I got a chance to present my concept to the senior design team.' },
        { scenario: 'design', content: 'Every designer should get a chance to observe real users interacting with their product.' },
      ]},
    ]
  },
  {
    id: 'V002', verb: 'Take', meaning: '拿 / 采取 / 花时间', frequencyRank: 2,
    collocations: [
      { id: 'C011', phrase: 'take a break', meaning: '休息一下', examples: [
        { scenario: 'daily', content: 'I need to take a break after working for three hours straight.' },
        { scenario: 'daily', content: 'Let\'s take a break and grab some coffee downstairs.' },
        { scenario: 'zju', content: 'The professor suggested we take a break between long lectures.' },
        { scenario: 'zju', content: 'During finals week, remember to take a break to avoid burnout.' },
        { scenario: 'design', content: 'It helps to take a break and come back to a design with fresh eyes.' },
        { scenario: 'design', content: 'After staring at pixels all day, you need to take a break.' },
      ]},
      { id: 'C012', phrase: 'take notes', meaning: '记笔记', examples: [
        { scenario: 'daily', content: 'I take notes during cooking shows to remember the recipes.' },
        { scenario: 'daily', content: 'She always takes notes when reading self-improvement books.' },
        { scenario: 'zju', content: 'I always take notes in class to review them before exams.' },
        { scenario: 'zju', content: 'Taking notes by hand helps me remember lectures better than typing.' },
        { scenario: 'design', content: 'During user interviews, I take notes on what confuses them most.' },
        { scenario: 'design', content: 'I take notes on design trends I spot in everyday products.' },
      ]},
      { id: 'C013', phrase: 'take action', meaning: '采取行动', examples: [
        { scenario: 'daily', content: 'We need to take action before the problem gets worse.' },
        { scenario: 'daily', content: 'Instead of complaining, it\'s better to take action and fix things.' },
        { scenario: 'zju', content: 'The student union decided to take action to improve campus facilities.' },
        { scenario: 'zju', content: 'If you see academic misconduct, you should take action and report it.' },
        { scenario: 'design', content: 'After identifying user pain points, the team took action immediately.' },
        { scenario: 'design', content: 'Good designers take action on feedback rather than ignoring it.' },
      ]},
      { id: 'C014', phrase: 'take part in', meaning: '参与 / 参加', examples: [
        { scenario: 'daily', content: 'I love to take part in local community events on weekends.' },
        { scenario: 'daily', content: 'My whole family takes part in the annual neighborhood cleanup.' },
        { scenario: 'zju', content: 'All students are encouraged to take part in the annual innovation competition.' },
        { scenario: 'zju', content: 'I took part in a hackathon and our team won second place.' },
        { scenario: 'design', content: 'We invited end users to take part in the co-design workshop.' },
        { scenario: 'design', content: 'Stakeholders should take part in the early stages of design thinking.' },
      ]},
      { id: 'C015', phrase: 'take care of', meaning: '照顾 / 处理', examples: [
        { scenario: 'daily', content: 'My sister takes care of our parents when I\'m away.' },
        { scenario: 'daily', content: 'I\'ll take care of dinner tonight—you just relax.' },
        { scenario: 'zju', content: 'I need to take care of my registration before the semester begins.' },
        { scenario: 'zju', content: 'The TA will take care of grading while the professor is away.' },
        { scenario: 'design', content: 'The project manager will take care of the client communication.' },
        { scenario: 'design', content: 'Our QA team takes care of testing before each design release.' },
      ]},
      { id: 'C016', phrase: 'take a chance', meaning: '冒险 / 尝试', examples: [
        { scenario: 'daily', content: 'Sometimes you have to take a chance and try something new.' },
        { scenario: 'daily', content: 'I took a chance on a street food stall and it was delicious.' },
        { scenario: 'zju', content: 'I decided to take a chance and apply for the exchange program.' },
        { scenario: 'zju', content: 'Taking a chance on a new elective can open up unexpected interests.' },
        { scenario: 'design', content: 'We took a chance with an unconventional design and it paid off.' },
        { scenario: 'design', content: 'Sometimes you need to take a chance on a bold color palette.' },
      ]},
      { id: 'C017', phrase: 'take time', meaning: '花时间 / 需要时间', examples: [
        { scenario: 'daily', content: 'Learning a new skill takes time and consistent effort.' },
        { scenario: 'daily', content: 'Take time to enjoy the small moments in life.' },
        { scenario: 'zju', content: 'Writing a good thesis takes time, so start early.' },
        { scenario: 'zju', content: 'It takes time to adjust to university life, but you\'ll get there.' },
        { scenario: 'design', content: 'Building a strong design system takes time, but it pays off.' },
        { scenario: 'design', content: 'Good typography takes time to get right, but it transforms the whole design.' },
      ]},
      { id: 'C018', phrase: 'take responsibility', meaning: '承担责任', examples: [
        { scenario: 'daily', content: 'You need to take responsibility for your own choices.' },
        { scenario: 'daily', content: 'Adults should take responsibility for their financial planning.' },
        { scenario: 'zju', content: 'As team leader, I need to take responsibility for the project outcome.' },
        { scenario: 'zju', content: 'Every group member should take responsibility for their assigned section.' },
        { scenario: 'design', content: 'Designers must take responsibility for how their products affect users.' },
        { scenario: 'design', content: 'We take responsibility for ensuring our design is inclusive and accessible.' },
      ]},
      { id: 'C019', phrase: 'take advantage of', meaning: '利用 / 充分利用', examples: [
        { scenario: 'daily', content: 'I take advantage of the sunny weather to go for a long run.' },
        { scenario: 'daily', content: 'You should take advantage of the holiday sale to stock up.' },
        { scenario: 'zju', content: 'You should take advantage of the free library resources at ZJU.' },
        { scenario: 'zju', content: 'Students can take advantage of office hours to clarify difficult concepts.' },
        { scenario: 'design', content: 'We took advantage of the new material to create a lighter product.' },
        { scenario: 'design', content: 'Take advantage of CSS grid to create more flexible layouts.' },
      ]},
      { id: 'C020', phrase: 'take a look', meaning: '看一下 / 检查', examples: [
        { scenario: 'daily', content: 'Can you take a look at my essay before I submit it?' },
        { scenario: 'daily', content: 'Take a look at this photo—doesn\'t the sunset look amazing?' },
        { scenario: 'zju', content: 'The professor asked us to take a look at the sample paper.' },
        { scenario: 'zju', content: 'Before the exam, take a look at the key formulas one more time.' },
        { scenario: 'design', content: 'Let me take a look at the wireframe and give you feedback.' },
        { scenario: 'design', content: 'Take a look at how competitors handle their onboarding flow.' },
      ]},
    ]
  },
  {
    id: 'V003', verb: 'Make', meaning: '制造 / 使得 / 做', frequencyRank: 3,
    collocations: [
      { id: 'C021', phrase: 'make a decision', meaning: '做决定', examples: [
        { scenario: 'daily', content: 'I had to make a decision between two job offers.' },
        { scenario: 'daily', content: 'Making a decision on what to eat for dinner is sometimes the hardest part of my day.' },
        { scenario: 'zju', content: 'Before choosing your major, make a decision based on your interests.' },
        { scenario: 'zju', content: 'The committee made a decision to extend the application deadline.' },
        { scenario: 'design', content: 'We need to make a decision on the color scheme by tomorrow.' },
        { scenario: 'design', content: 'Data-driven insights help us make a decision about which features to prioritize.' },
      ]},
      { id: 'C022', phrase: 'make progress', meaning: '取得进步', examples: [
        { scenario: 'daily', content: 'I\'m making progress with my guitar lessons every week.' },
        { scenario: 'daily', content: 'We\'re finally making progress on renovating the kitchen.' },
        { scenario: 'zju', content: 'We\'re making progress on the research paper, but still have more to do.' },
        { scenario: 'zju', content: 'She made significant progress in her thesis after getting feedback from her advisor.' },
        { scenario: 'design', content: 'The design team is making progress on the new product interface.' },
        { scenario: 'design', content: 'We made progress on the interaction design after the usability test results came in.' },
      ]},
      { id: 'C023', phrase: 'make a plan', meaning: '制定计划', examples: [
        { scenario: 'daily', content: 'Let\'s make a plan for the weekend trip in advance.' },
        { scenario: 'daily', content: 'I made a plan to save money by cooking at home more often.' },
        { scenario: 'zju', content: 'I always make a plan for the week on Sunday evening.' },
        { scenario: 'zju', content: 'Our study group made a plan to cover all exam topics in two weeks.' },
        { scenario: 'design', content: 'We made a plan to finish the prototype within two weeks.' },
        { scenario: 'design', content: 'Before starting any project, we always make a plan with clear milestones.' },
      ]},
      { id: 'C024', phrase: 'make sense', meaning: '有意义 / 合理 / 说得通', examples: [
        { scenario: 'daily', content: 'The instructions didn\'t make sense until I watched the video.' },
        { scenario: 'daily', content: 'It makes sense to buy in bulk if you use it every day.' },
        { scenario: 'zju', content: 'The professor\'s explanation finally made sense to me in the second class.' },
        { scenario: 'zju', content: 'Does it make sense to take five courses this semester when you also have an internship?' },
        { scenario: 'design', content: 'The navigation layout needs to make sense to first-time users.' },
        { scenario: 'design', content: 'If the icon doesn\'t make sense without a label, add a text description.' },
      ]},
      { id: 'C025', phrase: 'make an effort', meaning: '努力 / 尽力', examples: [
        { scenario: 'daily', content: 'I made an effort to wake up early every day this month.' },
        { scenario: 'daily', content: 'She makes an effort to stay in touch with her childhood friends.' },
        { scenario: 'zju', content: 'You need to make an effort to engage in class discussions.' },
        { scenario: 'zju', content: 'The university makes an effort to support students from diverse backgrounds.' },
        { scenario: 'design', content: 'The team made an effort to include accessibility features in the design.' },
        { scenario: 'design', content: 'We made an effort to reduce page load time for mobile users.' },
      ]},
      { id: 'C026', phrase: 'make a mistake', meaning: '犯错', examples: [
        { scenario: 'daily', content: 'I made a mistake in the recipe and added too much salt.' },
        { scenario: 'daily', content: 'Everyone makes mistakes—what matters is how you handle them.' },
        { scenario: 'zju', content: 'It\'s okay to make a mistake in a draft—just learn from it.' },
        { scenario: 'zju', content: 'I made a mistake in the calculation, which threw off the entire result.' },
        { scenario: 'design', content: 'We made a mistake in the first iteration and had to rethink the layout.' },
        { scenario: 'design', content: 'Making mistakes early in prototyping is much cheaper than making them in production.' },
      ]},
      { id: 'C027', phrase: 'make friends', meaning: '交朋友', examples: [
        { scenario: 'daily', content: 'It\'s easy to make friends when you join a sports club.' },
        { scenario: 'daily', content: 'Moving to a new city means you have to make friends all over again.' },
        { scenario: 'zju', content: 'I made friends from different departments in my first week at ZJU.' },
        { scenario: 'zju', content: 'Joining a student club is the quickest way to make friends on campus.' },
        { scenario: 'design', content: 'Attending design meetups is a great way to make friends in the industry.' },
        { scenario: 'design', content: 'Collaborating on open-source projects helps you make friends with designers worldwide.' },
      ]},
      { id: 'C028', phrase: 'make sure', meaning: '确保 / 确认', examples: [
        { scenario: 'daily', content: 'Make sure you lock the door before you leave.' },
        { scenario: 'daily', content: 'I always make sure to double-check my packing list before a trip.' },
        { scenario: 'zju', content: 'Make sure your citation format is correct before submitting.' },
        { scenario: 'zju', content: 'Make sure you back up your thesis file in at least two places.' },
        { scenario: 'design', content: 'Make sure the design meets the user requirements before handoff.' },
        { scenario: 'design', content: 'Always make sure your color contrast passes WCAG accessibility standards.' },
      ]},
      { id: 'C029', phrase: 'make a difference', meaning: '产生影响 / 有所不同', examples: [
        { scenario: 'daily', content: 'Even small acts of kindness can make a difference.' },
        { scenario: 'daily', content: 'Volunteering at the shelter made a real difference in my life.' },
        { scenario: 'zju', content: 'Your research could make a difference in how this problem is solved.' },
        { scenario: 'zju', content: 'One dedicated mentor can make a difference in a student\'s academic career.' },
        { scenario: 'design', content: 'Good UX design can make a difference in how users feel about a product.' },
        { scenario: 'design', content: 'Micro-interactions make a big difference in overall user satisfaction.' },
      ]},
      { id: 'C030', phrase: 'make use of', meaning: '利用 / 使用', examples: [
        { scenario: 'daily', content: 'I try to make use of every free hour to read or learn something.' },
        { scenario: 'daily', content: 'You can make use of leftovers to create a completely new meal.' },
        { scenario: 'zju', content: 'Students should make use of the campus tutoring center more.' },
        { scenario: 'zju', content: 'Make use of the online database to find relevant journal articles faster.' },
        { scenario: 'design', content: 'We made use of existing design patterns to save development time.' },
        { scenario: 'design', content: 'Make use of component libraries to maintain consistency across the product.' },
      ]},
    ]
  },
  {
    id: 'V004', verb: 'Do', meaning: '做 / 执行', frequencyRank: 4,
    collocations: [
      { id: 'C031', phrase: 'do research', meaning: '做研究 / 调查', examples: [
        { scenario: 'daily', content: 'I always do research before buying an expensive item.' },
        { scenario: 'zju', content: 'I do research at the lab every afternoon before dinner.' },
        { scenario: 'design', content: 'We do research with real users before starting any design work.' },
      ]},
      { id: 'C032', phrase: 'do one\'s best', meaning: '尽力 / 全力以赴', examples: [
        { scenario: 'daily', content: 'I always do my best when I take on a new challenge.' },
        { scenario: 'zju', content: 'All I can do is do my best in the final exam.' },
        { scenario: 'design', content: 'Even with limited resources, we did our best to deliver quality work.' },
      ]},
      { id: 'C033', phrase: 'do a good job', meaning: '做得好', examples: [
        { scenario: 'daily', content: 'You did a good job organizing the family reunion.' },
        { scenario: 'zju', content: 'The study group did a good job on the final presentation.' },
        { scenario: 'design', content: 'The team did a good job balancing creativity and functionality.' },
      ]},
      { id: 'C034', phrase: 'do without', meaning: '不用...也行 / 没有...凑合', examples: [
        { scenario: 'daily', content: 'I can do without TV, but I can\'t do without the internet.' },
        { scenario: 'zju', content: 'We had to do without some equipment and improvise during the experiment.' },
        { scenario: 'design', content: 'The design can do without the animation if it slows down the app.' },
      ]},
      { id: 'C035', phrase: 'do harm', meaning: '造成伤害 / 有害', examples: [
        { scenario: 'daily', content: 'Staying up too late can do harm to your health over time.' },
        { scenario: 'zju', content: 'Plagiarism does harm to your academic reputation permanently.' },
        { scenario: 'design', content: 'Poor design can do harm to user experience and brand trust.' },
      ]},
      { id: 'C036', phrase: 'do exercise', meaning: '锻炼', examples: [
        { scenario: 'daily', content: 'I try to do exercise at least three times a week.' },
        { scenario: 'zju', content: 'Many ZJU students do exercise in the sports center after class.' },
        { scenario: 'design', content: 'I find that doing exercise in the morning helps me think more creatively.' },
      ]},
      { id: 'C037', phrase: 'do someone a favor', meaning: '帮某人一个忙', examples: [
        { scenario: 'daily', content: 'Could you do me a favor and pick up some milk on your way home?' },
        { scenario: 'zju', content: 'Can you do me a favor and share your lecture notes from Monday?' },
        { scenario: 'design', content: 'Could you do me a favor and review this wireframe before the meeting?' },
      ]},
      { id: 'C038', phrase: 'do a project', meaning: '做项目', examples: [
        { scenario: 'daily', content: 'My kids and I did a craft project together last weekend.' },
        { scenario: 'zju', content: 'We are doing a joint project with the computer science department.' },
        { scenario: 'design', content: 'Doing a real-world project taught me more than any class.' },
      ]},
      { id: 'C039', phrase: 'do the trick', meaning: '奏效 / 解决问题', examples: [
        { scenario: 'daily', content: 'A quick nap should do the trick when I\'m feeling tired.' },
        { scenario: 'zju', content: 'A brief review session before the exam usually does the trick.' },
        { scenario: 'design', content: 'Adding a simple tooltip might do the trick for confused users.' },
      ]},
      { id: 'C040', phrase: 'do well', meaning: '表现好 / 做得出色', examples: [
        { scenario: 'daily', content: 'I did well in my last job interview and got the offer.' },
        { scenario: 'zju', content: 'To do well in this course, consistent effort is more important than talent.' },
        { scenario: 'design', content: 'Products that do well in usability testing tend to succeed in the market.' },
      ]},
    ]
  },
  {
    id: 'V005', verb: 'Have', meaning: '有 / 拥有 / 经历', frequencyRank: 5,
    collocations: [
      { id: 'C041', phrase: 'have a meeting', meaning: '开会', examples: [
        { scenario: 'daily', content: 'We have a meeting every Monday morning to plan the week.' },
        { scenario: 'zju', content: 'Our study group has a meeting before every major assignment.' },
        { scenario: 'design', content: 'We have a design review meeting every Friday afternoon.' },
      ]},
      { id: 'C042', phrase: 'have a look', meaning: '看一下 / 看看', examples: [
        { scenario: 'daily', content: 'Can you have a look at this and tell me what you think?' },
        { scenario: 'zju', content: 'I had a look at the sample exam and felt more confident.' },
        { scenario: 'design', content: 'Could you have a look at my mockup and give me some feedback?' },
      ]},
      { id: 'C043', phrase: 'have trouble', meaning: '遇到困难 / 有麻烦', examples: [
        { scenario: 'daily', content: 'I have trouble sleeping when I\'m stressed about work.' },
        { scenario: 'zju', content: 'Many students have trouble understanding the advanced math concepts.' },
        { scenario: 'design', content: 'Users have trouble finding the settings icon—it needs to be more visible.' },
      ]},
      { id: 'C044', phrase: 'have fun', meaning: '享受乐趣 / 玩得开心', examples: [
        { scenario: 'daily', content: 'We had so much fun at the outdoor concert last night.' },
        { scenario: 'zju', content: 'Don\'t forget to have fun and explore the city during your exchange.' },
        { scenario: 'design', content: 'Good design should make the user have fun while completing tasks.' },
      ]},
      { id: 'C045', phrase: 'have an impact', meaning: '产生影响', examples: [
        { scenario: 'daily', content: 'Small daily habits can have a huge impact on your long-term health.' },
        { scenario: 'zju', content: 'Your thesis research could have an impact on future engineering practices.' },
        { scenario: 'design', content: 'Inclusive design has a positive impact on all types of users.' },
      ]},
      { id: 'C046', phrase: 'have a conversation', meaning: '进行对话 / 交谈', examples: [
        { scenario: 'daily', content: 'We had a deep conversation about life goals over dinner.' },
        { scenario: 'zju', content: 'Having a conversation with your professor outside of class can be very useful.' },
        { scenario: 'design', content: 'We had a conversation with users to better understand their needs.' },
      ]},
      { id: 'C047', phrase: 'have experience', meaning: '有经验', examples: [
        { scenario: 'daily', content: 'He has a lot of experience cooking for large groups.' },
        { scenario: 'zju', content: 'Having experience in teamwork is just as important as academic grades.' },
        { scenario: 'design', content: 'I have experience working on both mobile and web design projects.' },
      ]},
      { id: 'C048', phrase: 'have access to', meaning: '能使用 / 有权访问', examples: [
        { scenario: 'daily', content: 'Not everyone has access to quality healthcare in rural areas.' },
        { scenario: 'zju', content: 'ZJU students have access to over a million digital academic resources.' },
        { scenario: 'design', content: 'Our team has access to powerful prototyping tools and design software.' },
      ]},
      { id: 'C049', phrase: 'have a break', meaning: '休息 / 暂停', examples: [
        { scenario: 'daily', content: 'Let\'s have a break and go for a short walk outside.' },
        { scenario: 'zju', content: 'We had a break between the two exam papers to clear our heads.' },
        { scenario: 'design', content: 'After six hours of work, the design team finally had a break.' },
      ]},
      { id: 'C050', phrase: 'have a point', meaning: '有道理 / 说得对', examples: [
        { scenario: 'daily', content: 'You have a point—I should try a different approach.' },
        { scenario: 'zju', content: 'The critic had a point when they said the argument lacked evidence.' },
        { scenario: 'design', content: 'The client had a point about the font size being too small for elderly users.' },
      ]},
    ]
  },
  {
    id: 'V006', verb: 'Go', meaning: '去 / 进行 / 变成', frequencyRank: 6,
    collocations: [
      { id: 'C051', phrase: 'go ahead', meaning: '继续 / 开始吧', examples: [
        { scenario: 'daily', content: 'Go ahead and start eating—don\'t wait for me.' },
        { scenario: 'zju', content: 'If everyone is ready, let\'s go ahead with the presentation.' },
        { scenario: 'design', content: 'The client approved the concept, so we can go ahead with the prototype.' },
      ]},
      { id: 'C052', phrase: 'go through', meaning: '经历 / 仔细检查', examples: [
        { scenario: 'daily', content: 'I went through a difficult period after moving to a new city.' },
        { scenario: 'zju', content: 'Please go through your report carefully before submission.' },
        { scenario: 'design', content: 'Let\'s go through the feedback from last week\'s user testing.' },
      ]},
      { id: 'C053', phrase: 'go on', meaning: '继续 / 发生', examples: [
        { scenario: 'daily', content: 'Despite the rain, the event went on as planned.' },
        { scenario: 'zju', content: 'Class goes on even when only a few students show up.' },
        { scenario: 'design', content: 'The project went on for two extra weeks due to design changes.' },
      ]},
      { id: 'C054', phrase: 'go over', meaning: '复习 / 回顾', examples: [
        { scenario: 'daily', content: 'Let\'s go over the plan one more time before the trip.' },
        { scenario: 'zju', content: 'I go over my notes every Sunday to prepare for the week ahead.' },
        { scenario: 'design', content: 'Let\'s go over the design requirements with the whole team.' },
      ]},
      { id: 'C055', phrase: 'go wrong', meaning: '出错 / 出问题', examples: [
        { scenario: 'daily', content: 'Everything went wrong at the worst possible moment.' },
        { scenario: 'zju', content: 'When the experiment goes wrong, you document what happened and try again.' },
        { scenario: 'design', content: 'We need to think about what could go wrong in the user flow.' },
      ]},
      { id: 'C056', phrase: 'go beyond', meaning: '超越 / 不止于此', examples: [
        { scenario: 'daily', content: 'Her kindness went beyond what anyone expected.' },
        { scenario: 'zju', content: 'Great research goes beyond what is written in the textbook.' },
        { scenario: 'design', content: 'We want our designs to go beyond aesthetics and solve real problems.' },
      ]},
      { id: 'C057', phrase: 'go with', meaning: '配合 / 选择', examples: [
        { scenario: 'daily', content: 'I think I\'ll go with the blue jacket—it matches better.' },
        { scenario: 'zju', content: 'I decided to go with the simpler argument for the essay.' },
        { scenario: 'design', content: 'We decided to go with a minimalist layout for the landing page.' },
      ]},
      { id: 'C058', phrase: 'go for', meaning: '争取 / 选择 / 尝试', examples: [
        { scenario: 'daily', content: 'If you really want it, just go for it.' },
        { scenario: 'zju', content: 'I decided to go for the most challenging project topic.' },
        { scenario: 'design', content: 'The team decided to go for a bold, unconventional design direction.' },
      ]},
      { id: 'C059', phrase: 'go back to', meaning: '回到 / 重新开始', examples: [
        { scenario: 'daily', content: 'Sometimes I go back to basics when I\'m feeling lost.' },
        { scenario: 'zju', content: 'We had to go back to the original data and reanalyze it.' },
        { scenario: 'design', content: 'We had to go back to the drawing board after user testing failed.' },
      ]},
      { id: 'C060', phrase: 'go along with', meaning: '同意 / 跟随', examples: [
        { scenario: 'daily', content: 'I decided to go along with the group\'s decision even if I disagreed.' },
        { scenario: 'zju', content: 'Not everyone has to go along with the professor\'s interpretation.' },
        { scenario: 'design', content: 'I didn\'t fully go along with the client\'s suggestion—I proposed an alternative.' },
      ]},
    ]
  },
  {
    id: 'V007', verb: 'Set', meaning: '设置 / 确立', frequencyRank: 7,
    collocations: [
      { id: 'C061', phrase: 'set up', meaning: '建立 / 设置', examples: [
        { scenario: 'daily', content: 'I need to set up my new phone before the trip.' },
        { scenario: 'zju', content: 'The department set up a new mentoring program for freshman.' },
        { scenario: 'design', content: 'We need to set up a clear design system before starting the project.' },
      ]},
      { id: 'C062', phrase: 'set goals', meaning: '设定目标', examples: [
        { scenario: 'daily', content: 'I set goals at the beginning of each month to stay focused.' },
        { scenario: 'zju', content: 'Setting clear academic goals helped me manage my time better at ZJU.' },
        { scenario: 'design', content: 'The team sets goals at the start of each sprint to track progress.' },
      ]},
      { id: 'C063', phrase: 'set aside', meaning: '留出 / 搁置', examples: [
        { scenario: 'daily', content: 'I set aside one hour each day for reading.' },
        { scenario: 'zju', content: 'Set aside time for extracurricular activities—they are just as important.' },
        { scenario: 'design', content: 'We set aside the visual details and focused on the structure first.' },
      ]},
      { id: 'C064', phrase: 'set a deadline', meaning: '设定截止日期', examples: [
        { scenario: 'daily', content: 'If you don\'t set a deadline, the task will never get done.' },
        { scenario: 'zju', content: 'Our professor set a strict deadline—no extensions allowed.' },
        { scenario: 'design', content: 'We set a deadline to deliver the final designs by end of the month.' },
      ]},
      { id: 'C065', phrase: 'set an example', meaning: '树立榜样', examples: [
        { scenario: 'daily', content: 'Parents should set an example for their children through their actions.' },
        { scenario: 'zju', content: 'Senior students should set an example of academic integrity for juniors.' },
        { scenario: 'design', content: 'Leading companies set an example of ethical and inclusive design.' },
      ]},
      { id: 'C066', phrase: 'set priorities', meaning: '确定优先级', examples: [
        { scenario: 'daily', content: 'You need to set priorities if you want to balance work and life.' },
        { scenario: 'zju', content: 'During exam season, you need to set priorities and focus on key subjects.' },
        { scenario: 'design', content: 'Let\'s set priorities for which features to include in version one.' },
      ]},
      { id: 'C067', phrase: 'set limits', meaning: '设定限制', examples: [
        { scenario: 'daily', content: 'It\'s healthy to set limits on screen time each day.' },
        { scenario: 'zju', content: 'Group projects should set limits on how much each person contributes to avoid imbalance.' },
        { scenario: 'design', content: 'We need to set limits on the scope of this project to stay on schedule.' },
      ]},
      { id: 'C068', phrase: 'set out', meaning: '出发 / 着手开始', examples: [
        { scenario: 'daily', content: 'We set out early in the morning to avoid traffic.' },
        { scenario: 'zju', content: 'When I set out to write my thesis, I had no idea how complex it would be.' },
        { scenario: 'design', content: 'When we set out to redesign the app, we interviewed 30 users first.' },
      ]},
      { id: 'C069', phrase: 'set the stage', meaning: '奠定基础 / 做铺垫', examples: [
        { scenario: 'daily', content: 'A good morning routine can set the stage for a productive day.' },
        { scenario: 'zju', content: 'The first chapter of my thesis sets the stage for all the arguments that follow.' },
        { scenario: 'design', content: 'The opening screen of an app sets the stage for the entire user experience.' },
      ]},
      { id: 'C070', phrase: 'set in motion', meaning: '启动 / 推动进行', examples: [
        { scenario: 'daily', content: 'Once you set a habit in motion, it becomes easier to maintain.' },
        { scenario: 'zju', content: 'The funding announcement set a series of research projects in motion.' },
        { scenario: 'design', content: 'The kickoff meeting set the project in motion and energized the whole team.' },
      ]},
    ]
  },
  {
    id: 'V008', verb: 'Keep', meaning: '保持 / 坚持 / 继续', frequencyRank: 8,
    collocations: [
      { id: 'C071', phrase: 'keep up', meaning: '保持 / 继续努力', examples: [
        { scenario: 'daily', content: 'Keep up the good work—you\'re doing really well.' },
        { scenario: 'zju', content: 'It\'s hard to keep up with the reading load in this course.' },
        { scenario: 'design', content: 'It\'s important to keep up with the latest design trends and tools.' },
      ]},
      { id: 'C072', phrase: 'keep track of', meaning: '追踪 / 记录', examples: [
        { scenario: 'daily', content: 'I use an app to keep track of my daily expenses.' },
        { scenario: 'zju', content: 'Keep track of all your academic deadlines to avoid missing submissions.' },
        { scenario: 'design', content: 'We use a shared spreadsheet to keep track of design feedback.' },
      ]},
      { id: 'C073', phrase: 'keep in mind', meaning: '记住 / 牢记', examples: [
        { scenario: 'daily', content: 'Keep in mind that the store closes early on weekends.' },
        { scenario: 'zju', content: 'Keep in mind the assessment criteria when writing your essay.' },
        { scenario: 'design', content: 'Keep in mind that not all users are tech-savvy when designing the interface.' },
      ]},
      { id: 'C074', phrase: 'keep going', meaning: '坚持 / 继续', examples: [
        { scenario: 'daily', content: 'Even when it\'s hard, you just need to keep going.' },
        { scenario: 'zju', content: 'During the hardest parts of my thesis, I just told myself to keep going.' },
        { scenario: 'design', content: 'When the design process feels messy, just keep going—clarity will come.' },
      ]},
      { id: 'C075', phrase: 'keep pace with', meaning: '跟上...步伐', examples: [
        { scenario: 'daily', content: 'It\'s hard to keep pace with all the changes in technology.' },
        { scenario: 'zju', content: 'Students need to keep pace with the rapid developments in their fields.' },
        { scenario: 'design', content: 'We need to keep pace with competitor products to stay relevant.' },
      ]},
      { id: 'C076', phrase: 'keep in touch', meaning: '保持联系', examples: [
        { scenario: 'daily', content: 'Let\'s keep in touch after you move to the new city.' },
        { scenario: 'zju', content: 'I try to keep in touch with professors who have given me guidance.' },
        { scenario: 'design', content: 'We should keep in touch with the client throughout the design process.' },
      ]},
      { id: 'C077', phrase: 'keep a record', meaning: '记录 / 保存记录', examples: [
        { scenario: 'daily', content: 'I keep a record of what I eat to maintain a healthy diet.' },
        { scenario: 'zju', content: 'You should keep a record of all the sources you consult for your paper.' },
        { scenario: 'design', content: 'The team keeps a record of every design decision and the reasoning behind it.' },
      ]},
      { id: 'C078', phrase: 'keep calm', meaning: '保持冷静', examples: [
        { scenario: 'daily', content: 'The key in a crisis is to keep calm and think clearly.' },
        { scenario: 'zju', content: 'Keep calm during presentations—nervousness is normal for everyone.' },
        { scenario: 'design', content: 'When client feedback is harsh, a good designer keeps calm and asks questions.' },
      ]},
      { id: 'C079', phrase: 'keep up with', meaning: '跟上 / 赶上', examples: [
        { scenario: 'daily', content: 'I struggle to keep up with the news every day.' },
        { scenario: 'zju', content: 'I find it challenging to keep up with the pace of advanced courses.' },
        { scenario: 'design', content: 'It\'s hard to keep up with all the new UI components being released.' },
      ]},
      { id: 'C080', phrase: 'keep an eye on', meaning: '留意 / 关注', examples: [
        { scenario: 'daily', content: 'Please keep an eye on the soup while I answer the door.' },
        { scenario: 'zju', content: 'Keep an eye on the class group chat for important announcements.' },
        { scenario: 'design', content: 'We should keep an eye on how users interact with the new feature.' },
      ]},
    ]
  },
  {
    id: 'V009', verb: 'Give', meaning: '给予 / 提供', frequencyRank: 9,
    collocations: [
      { id: 'C081', phrase: 'give a presentation', meaning: '做演讲 / 展示', examples: [
        { scenario: 'daily', content: 'I need to give a presentation at work about the new strategy.' },
        { scenario: 'zju', content: 'Every student has to give a presentation at the end of the semester.' },
        { scenario: 'design', content: 'I gave a presentation of the final design concept to the whole company.' },
      ]},
      { id: 'C082', phrase: 'give feedback', meaning: '提供反馈', examples: [
        { scenario: 'daily', content: 'I always give feedback in a constructive and respectful way.' },
        { scenario: 'zju', content: 'The professor gave detailed feedback on our draft reports.' },
        { scenario: 'design', content: 'We give feedback on each other\'s designs during the weekly review.' },
      ]},
      { id: 'C083', phrase: 'give up', meaning: '放弃', examples: [
        { scenario: 'daily', content: 'I refused to give up even when the going got tough.' },
        { scenario: 'zju', content: 'Don\'t give up on a difficult subject—seek help from tutors.' },
        { scenario: 'design', content: 'We almost gave up on the idea, but then user testing proved it worked.' },
      ]},
      { id: 'C084', phrase: 'give a hand', meaning: '帮个忙 / 协助', examples: [
        { scenario: 'daily', content: 'Could you give me a hand moving these boxes?' },
        { scenario: 'zju', content: 'Senior students often give a hand to juniors who are just starting out.' },
        { scenario: 'design', content: 'I asked a colleague to give me a hand with the complex interaction design.' },
      ]},
      { id: 'C085', phrase: 'give an example', meaning: '举例说明', examples: [
        { scenario: 'daily', content: 'Can you give an example of what you mean?' },
        { scenario: 'zju', content: 'The professor always gives an example to help explain abstract concepts.' },
        { scenario: 'design', content: 'In my portfolio, I always give an example of the problem I was solving.' },
      ]},
      { id: 'C086', phrase: 'give advice', meaning: '给建议', examples: [
        { scenario: 'daily', content: 'I give advice to my younger sibling whenever they ask.' },
        { scenario: 'zju', content: 'Academic advisors give advice on course selection and career planning.' },
        { scenario: 'design', content: 'Senior designers give advice to juniors on how to present their work.' },
      ]},
      { id: 'C087', phrase: 'give credit to', meaning: '给予肯定 / 认可功劳', examples: [
        { scenario: 'daily', content: 'I want to give credit to everyone who helped plan the event.' },
        { scenario: 'zju', content: 'In academic writing, you must give credit to the original authors.' },
        { scenario: 'design', content: 'It\'s important to give credit to team members when presenting group work.' },
      ]},
      { id: 'C088', phrase: 'give a try', meaning: '试一试', examples: [
        { scenario: 'daily', content: 'I\'ve never tried Thai food, but I\'ll give it a try tonight.' },
        { scenario: 'zju', content: 'If you\'re not sure about a topic, give it a try—you might enjoy it.' },
        { scenario: 'design', content: 'Let\'s give the new design tool a try and see if it speeds up our workflow.' },
      ]},
      { id: 'C089', phrase: 'give thought to', meaning: '认真考虑', examples: [
        { scenario: 'daily', content: 'Give some thought to where you want to be in five years.' },
        { scenario: 'zju', content: 'Before choosing a thesis topic, give careful thought to its feasibility.' },
        { scenario: 'design', content: 'We need to give more thought to the accessibility of this feature.' },
      ]},
      { id: 'C090', phrase: 'give an opinion', meaning: '表达意见', examples: [
        { scenario: 'daily', content: 'I\'m happy to give my opinion, but the final choice is yours.' },
        { scenario: 'zju', content: 'Students are encouraged to give their opinions in seminar discussions.' },
        { scenario: 'design', content: 'Everyone on the team gave their opinion during the design critique.' },
      ]},
    ]
  },
  {
    id: 'V010', verb: 'Put', meaning: '放置 / 投入', frequencyRank: 10,
    collocations: [
      { id: 'C091', phrase: 'put together', meaning: '组合 / 整理', examples: [
        { scenario: 'daily', content: 'It took me two hours to put together the new furniture.' },
        { scenario: 'zju', content: 'We put together a strong team for the engineering competition.' },
        { scenario: 'design', content: 'I put together a style guide to keep the design consistent.' },
      ]},
      { id: 'C092', phrase: 'put forward', meaning: '提出 / 提议', examples: [
        { scenario: 'daily', content: 'She put forward an interesting idea at the community meeting.' },
        { scenario: 'zju', content: 'The research team put forward a new hypothesis based on the data.' },
        { scenario: 'design', content: 'I put forward three design concepts for the client to choose from.' },
      ]},
      { id: 'C093', phrase: 'put off', meaning: '推迟 / 拖延', examples: [
        { scenario: 'daily', content: 'I keep putting off the dentist appointment, which is a bad habit.' },
        { scenario: 'zju', content: 'Don\'t put off studying until the night before the exam.' },
        { scenario: 'design', content: 'We put off the launch to fix a critical accessibility issue.' },
      ]},
      { id: 'C094', phrase: 'put into practice', meaning: '付诸实践', examples: [
        { scenario: 'daily', content: 'I\'m trying to put what I\'ve learned about nutrition into practice.' },
        { scenario: 'zju', content: 'The internship let me put my classroom knowledge into practice.' },
        { scenario: 'design', content: 'User research is only useful when you put the findings into practice.' },
      ]},
      { id: 'C095', phrase: 'put effort into', meaning: '努力投入于', examples: [
        { scenario: 'daily', content: 'I put a lot of effort into learning how to cook this year.' },
        { scenario: 'zju', content: 'Put effort into your written assignments—they count toward your grade.' },
        { scenario: 'design', content: 'We put tremendous effort into making the product as simple as possible.' },
      ]},
      { id: 'C096', phrase: 'put pressure on', meaning: '施加压力', examples: [
        { scenario: 'daily', content: 'Too many deadlines put a lot of pressure on me at once.' },
        { scenario: 'zju', content: 'The competitive environment puts pressure on students to perform.' },
        { scenario: 'design', content: 'Tight timelines put pressure on the team to cut corners.' },
      ]},
      { id: 'C097', phrase: 'put aside', meaning: '放下 / 暂时搁置', examples: [
        { scenario: 'daily', content: 'Put aside your differences and focus on the common goal.' },
        { scenario: 'zju', content: 'Put aside distractions and focus during the study session.' },
        { scenario: 'design', content: 'We put aside personal preferences and focused on what the data suggested.' },
      ]},
      { id: 'C098', phrase: 'put on hold', meaning: '暂停 / 搁置', examples: [
        { scenario: 'daily', content: 'We had to put the renovation project on hold due to budget issues.' },
        { scenario: 'zju', content: 'The publication was put on hold while the professor reviewed the data.' },
        { scenario: 'design', content: 'The redesign was put on hold while we gathered more user feedback.' },
      ]},
      { id: 'C099', phrase: 'put into words', meaning: '用言语表达', examples: [
        { scenario: 'daily', content: 'Sometimes it\'s hard to put complex emotions into words.' },
        { scenario: 'zju', content: 'Putting your research findings into clear words is a valuable academic skill.' },
        { scenario: 'design', content: 'Good design communicates things that are hard to put into words.' },
      ]},
      { id: 'C100', phrase: 'put up with', meaning: '忍受 / 接受', examples: [
        { scenario: 'daily', content: 'I can\'t put up with noisy neighbors anymore—I\'m moving.' },
        { scenario: 'zju', content: 'Students often have to put up with difficult group dynamics in team projects.' },
        { scenario: 'design', content: 'Users shouldn\'t have to put up with confusing navigation—fix it.' },
      ]},
    ]
  },
  {
    id: 'V011', verb: 'Come', meaning: '来 / 出现 / 产生', frequencyRank: 11,
    collocations: [
      { id: 'C101', phrase: 'come up with', meaning: '想出 / 提出', examples: [
        { scenario: 'daily', content: 'I came up with a great idea for my sister\'s birthday party.' },
        { scenario: 'zju', content: 'Our team came up with three possible solutions to the research problem.' },
        { scenario: 'design', content: 'After brainstorming, we came up with a concept that everyone loved.' },
      ]},
      { id: 'C102', phrase: 'come across', meaning: '偶然遇见 / 给人印象', examples: [
        { scenario: 'daily', content: 'I came across an interesting article about healthy habits.' },
        { scenario: 'zju', content: 'I came across this paper while doing background research for my thesis.' },
        { scenario: 'design', content: 'The design should come across as professional and trustworthy.' },
      ]},
      { id: 'C103', phrase: 'come to a conclusion', meaning: '得出结论', examples: [
        { scenario: 'daily', content: 'After talking it over, we came to the conclusion that moving was the best option.' },
        { scenario: 'zju', content: 'The research team came to the conclusion that the hypothesis was correct.' },
        { scenario: 'design', content: 'After testing three prototypes, we came to the conclusion that option B worked best.' },
      ]},
      { id: 'C104', phrase: 'come into play', meaning: '开始起作用 / 发挥作用', examples: [
        { scenario: 'daily', content: 'Personal discipline really comes into play when working from home.' },
        { scenario: 'zju', content: 'Cultural awareness comes into play when collaborating with international students.' },
        { scenario: 'design', content: 'Ergonomics comes into play when designing physical products for long use.' },
      ]},
      { id: 'C105', phrase: 'come up', meaning: '被提出 / 出现', examples: [
        { scenario: 'daily', content: 'An issue came up at work and I had to deal with it immediately.' },
        { scenario: 'zju', content: 'Several interesting questions came up during the seminar discussion.' },
        { scenario: 'design', content: 'A few usability issues came up during the prototype testing session.' },
      ]},
      { id: 'C106', phrase: 'come back to', meaning: '回到 / 重新考虑', examples: [
        { scenario: 'daily', content: 'I\'ll come back to this chapter after I finish the rest of the book.' },
        { scenario: 'zju', content: 'Let\'s come back to this question in the next lecture when we have more context.' },
        { scenario: 'design', content: 'We came back to an earlier concept after the new one didn\'t test well.' },
      ]},
      { id: 'C107', phrase: 'come from', meaning: '来自 / 源于', examples: [
        { scenario: 'daily', content: 'My passion for cooking comes from watching my grandmother in the kitchen.' },
        { scenario: 'zju', content: 'The most innovative ideas often come from cross-disciplinary thinking.' },
        { scenario: 'design', content: 'The inspiration for this design came from nature and organic forms.' },
      ]},
      { id: 'C108', phrase: 'come to mind', meaning: '想到 / 浮现在脑海', examples: [
        { scenario: 'daily', content: 'When I think of comfort food, pasta always comes to mind.' },
        { scenario: 'zju', content: 'What examples come to mind when you think about sustainable engineering?' },
        { scenario: 'design', content: 'When users think of the brand, a clear visual identity should come to mind.' },
      ]},
      { id: 'C109', phrase: 'come to terms with', meaning: '接受 / 习惯', examples: [
        { scenario: 'daily', content: 'It took me months to come to terms with the fact that I had failed.' },
        { scenario: 'zju', content: 'Some students struggle to come to terms with the high academic pressure at ZJU.' },
        { scenario: 'design', content: 'We had to come to terms with the project\'s technical limitations early on.' },
      ]},
      { id: 'C110', phrase: 'come out', meaning: '出版 / 发布 / 结果', examples: [
        { scenario: 'daily', content: 'The new season of my favorite show comes out next Friday.' },
        { scenario: 'zju', content: 'My research paper came out in a well-known academic journal last month.' },
        { scenario: 'design', content: 'The product finally came out after months of testing and revision.' },
      ]},
    ]
  },
  {
    id: 'V012', verb: 'See', meaning: '看见 / 理解 / 看待', frequencyRank: 12,
    collocations: [
      { id: 'C111', phrase: 'see the point', meaning: '理解要点 / 明白意义', examples: [
        { scenario: 'daily', content: 'I see the point you\'re making—it does make sense now.' },
        { scenario: 'zju', content: 'At first I didn\'t see the point of the exercise, but now I understand.' },
        { scenario: 'design', content: 'Once users see the point of the feature, their engagement increases.' },
      ]},
      { id: 'C112', phrase: 'see progress', meaning: '看到进步 / 发现进展', examples: [
        { scenario: 'daily', content: 'I can see real progress in my fitness after two months of training.' },
        { scenario: 'zju', content: 'It feels great to see progress in my writing from last year to this year.' },
        { scenario: 'design', content: 'We saw good progress after incorporating user feedback into the redesign.' },
      ]},
      { id: 'C113', phrase: 'see things differently', meaning: '从不同角度看问题', examples: [
        { scenario: 'daily', content: 'Traveling abroad helped me see things differently.' },
        { scenario: 'zju', content: 'Studying multiple disciplines helps you see things differently and more creatively.' },
        { scenario: 'design', content: 'User interviews help the design team see things differently and challenge assumptions.' },
      ]},
      { id: 'C114', phrase: 'see potential', meaning: '看到潜力', examples: [
        { scenario: 'daily', content: 'I see great potential in this neighborhood for small businesses.' },
        { scenario: 'zju', content: 'The professor saw potential in my research idea and encouraged me to pursue it.' },
        { scenario: 'design', content: 'We saw the potential of this material to change the way products are made.' },
      ]},
      { id: 'C115', phrase: 'see through', meaning: '看穿 / 识破 / 完成', examples: [
        { scenario: 'daily', content: 'I could see through his excuse—it was clearly not true.' },
        { scenario: 'zju', content: 'A good research methodology can see through surface data to find deeper insights.' },
        { scenario: 'design', content: 'We committed to seeing the project through despite the many challenges.' },
      ]},
      { id: 'C116', phrase: 'see the benefit', meaning: '看到好处 / 认识到益处', examples: [
        { scenario: 'daily', content: 'I started to see the benefit of waking up early after a week of trying.' },
        { scenario: 'zju', content: 'Once you see the benefit of critical thinking, it changes how you study.' },
        { scenario: 'design', content: 'Users started to see the benefit of the new workflow after the second week.' },
      ]},
      { id: 'C117', phrase: 'see it from...', meaning: '从...角度理解', examples: [
        { scenario: 'daily', content: 'Try to see it from the other person\'s perspective before judging.' },
        { scenario: 'zju', content: 'A good essay sees the issue from multiple academic perspectives.' },
        { scenario: 'design', content: 'Always try to see the design from the user\'s point of view.' },
      ]},
      { id: 'C118', phrase: 'see value in', meaning: '在...中发现价值', examples: [
        { scenario: 'daily', content: 'I see value in spending time alone to recharge.' },
        { scenario: 'zju', content: 'I see value in taking courses outside my major for a broader perspective.' },
        { scenario: 'design', content: 'The client started to see value in the research phase once they saw the insights.' },
      ]},
      { id: 'C119', phrase: 'see the connection', meaning: '发现联系', examples: [
        { scenario: 'daily', content: 'After the lecture, I started to see the connection between theory and practice.' },
        { scenario: 'zju', content: 'Once you see the connection between all the topics, the course makes much more sense.' },
        { scenario: 'design', content: 'We need to help users see the connection between different features.' },
      ]},
      { id: 'C120', phrase: 'see the result', meaning: '看到结果', examples: [
        { scenario: 'daily', content: 'After weeks of effort, I finally started to see the result.' },
        { scenario: 'zju', content: 'It\'s motivating to see the result of your hard work in your final grade.' },
        { scenario: 'design', content: 'We were excited to see the result of the usability improvements in the data.' },
      ]},
    ]
  },
  {
    id: 'V013', verb: 'Know', meaning: '知道 / 了解', frequencyRank: 13,
    collocations: [
      { id: 'C121', phrase: 'know how to', meaning: '知道如何做', examples: [
        { scenario: 'daily', content: 'I know how to cook several dishes from different cuisines.' },
        { scenario: 'zju', content: 'Knowing how to manage your time is a critical skill at university.' },
        { scenario: 'design', content: 'A good designer knows how to balance visual appeal and usability.' },
      ]},
      { id: 'C122', phrase: 'know for sure', meaning: '确定 / 肯定知道', examples: [
        { scenario: 'daily', content: 'I don\'t know for sure yet, but I think we\'re going to Paris.' },
        { scenario: 'zju', content: 'We won\'t know for sure until the results are published next week.' },
        { scenario: 'design', content: 'We don\'t know for sure which design works better until we test them.' },
      ]},
      { id: 'C123', phrase: 'know the difference', meaning: '知道区别 / 区分', examples: [
        { scenario: 'daily', content: 'Do you know the difference between a need and a want?' },
        { scenario: 'zju', content: 'It\'s important to know the difference between correlation and causation in research.' },
        { scenario: 'design', content: 'Designers should know the difference between UI and UX clearly.' },
      ]},
      { id: 'C124', phrase: 'know what it takes', meaning: '知道需要什么 / 了解条件', examples: [
        { scenario: 'daily', content: 'Starting a business is tough—do you know what it takes?' },
        { scenario: 'zju', content: 'I know what it takes to get a top grade in this course.' },
        { scenario: 'design', content: 'After years of experience, I know what it takes to lead a design project.' },
      ]},
      { id: 'C125', phrase: 'know better', meaning: '应该更清楚 / 不该那样做', examples: [
        { scenario: 'daily', content: 'I should have known better than to skip breakfast before a long day.' },
        { scenario: 'zju', content: 'You know better than to submit work without proofreading it.' },
        { scenario: 'design', content: 'Experienced designers know better than to ignore user feedback.' },
      ]},
      { id: 'C126', phrase: 'know by heart', meaning: '熟记 / 烂熟于心', examples: [
        { scenario: 'daily', content: 'I know this song by heart—I\'ve heard it hundreds of times.' },
        { scenario: 'zju', content: 'I know the key formulas by heart after doing so many practice problems.' },
        { scenario: 'design', content: 'Good designers know common UI patterns by heart and apply them instinctively.' },
      ]},
      { id: 'C127', phrase: 'know the importance', meaning: '了解重要性', examples: [
        { scenario: 'daily', content: 'I know the importance of sleep after years of ignoring it.' },
        { scenario: 'zju', content: 'All students should know the importance of citing sources correctly.' },
        { scenario: 'design', content: 'Our team knows the importance of accessibility in product design.' },
      ]},
      { id: 'C128', phrase: 'know in advance', meaning: '提前知道', examples: [
        { scenario: 'daily', content: 'If you know in advance about the traffic, you can plan a different route.' },
        { scenario: 'zju', content: 'Students should know in advance what to expect in the final exam format.' },
        { scenario: 'design', content: 'We knew in advance that the deadline was tight, so we prepared early.' },
      ]},
      { id: 'C129', phrase: 'know the basics', meaning: '了解基础 / 掌握基本知识', examples: [
        { scenario: 'daily', content: 'Before investing, you should at least know the basics of finance.' },
        { scenario: 'zju', content: 'Knowing the basics of programming is now essential in almost every field.' },
        { scenario: 'design', content: 'Every designer should know the basics of typography and color theory.' },
      ]},
      { id: 'C130', phrase: 'know the reason', meaning: '知道原因', examples: [
        { scenario: 'daily', content: 'I need to know the reason why this keeps happening.' },
        { scenario: 'zju', content: 'Understanding your data means knowing the reason behind the patterns you see.' },
        { scenario: 'design', content: 'We need to know the reason users drop off at this point in the flow.' },
      ]},
    ]
  },
  {
    id: 'V014', verb: 'Think', meaning: '思考 / 认为 / 考虑', frequencyRank: 14,
    collocations: [
      { id: 'C131', phrase: 'think about', meaning: '考虑 / 思考', examples: [
        { scenario: 'daily', content: 'I\'ve been thinking about changing my career for a while.' },
        { scenario: 'zju', content: 'Think about the broader implications of your research before drawing conclusions.' },
        { scenario: 'design', content: 'We need to think about how the product will age over time.' },
      ]},
      { id: 'C132', phrase: 'think outside the box', meaning: '创新思维 / 打破常规', examples: [
        { scenario: 'daily', content: 'For the party decoration, I tried to think outside the box.' },
        { scenario: 'zju', content: 'Professors encourage students to think outside the box, not just memorize facts.' },
        { scenario: 'design', content: 'The best design solutions come from thinking outside the box.' },
      ]},
      { id: 'C133', phrase: 'think ahead', meaning: '提前考虑 / 未雨绸缪', examples: [
        { scenario: 'daily', content: 'If you think ahead, you can avoid most last-minute problems.' },
        { scenario: 'zju', content: 'Think ahead and plan your course selection for the entire degree program.' },
        { scenario: 'design', content: 'We need to think ahead about how the design will scale as the user base grows.' },
      ]},
      { id: 'C134', phrase: 'think critically', meaning: '批判性地思考', examples: [
        { scenario: 'daily', content: 'It\'s important to think critically about the news you consume online.' },
        { scenario: 'zju', content: 'University education should teach you to think critically, not just absorb information.' },
        { scenario: 'design', content: 'Thinking critically about user behavior helps us avoid design bias.' },
      ]},
      { id: 'C135', phrase: 'think it through', meaning: '想清楚 / 仔细考虑', examples: [
        { scenario: 'daily', content: 'Before you say yes, think it through carefully.' },
        { scenario: 'zju', content: 'Don\'t rush into your thesis topic—think it through thoroughly first.' },
        { scenario: 'design', content: 'Let\'s think through the entire user journey before we start designing.' },
      ]},
      { id: 'C136', phrase: 'think in terms of', meaning: '从...角度思考', examples: [
        { scenario: 'daily', content: 'Try to think in terms of long-term benefits, not just immediate rewards.' },
        { scenario: 'zju', content: 'Think in terms of systems, not just individual components, in your engineering thesis.' },
        { scenario: 'design', content: 'We should think in terms of the entire user experience, not just one screen.' },
      ]},
      { id: 'C137', phrase: 'think of a way', meaning: '想出一个方法', examples: [
        { scenario: 'daily', content: 'I need to think of a way to explain this to my parents.' },
        { scenario: 'zju', content: 'We need to think of a way to conduct this experiment with limited equipment.' },
        { scenario: 'design', content: 'The team worked all night to think of a way to simplify the checkout flow.' },
      ]},
      { id: 'C138', phrase: 'think it over', meaning: '再想想 / 重新考虑', examples: [
        { scenario: 'daily', content: 'I need to think it over before I give you my final answer.' },
        { scenario: 'zju', content: 'Think it over carefully before choosing whether to take that extra course.' },
        { scenario: 'design', content: 'The client asked us to think it over and come back with a revised concept.' },
      ]},
      { id: 'C139', phrase: 'think beyond', meaning: '超越常规思考 / 拓展视野', examples: [
        { scenario: 'daily', content: 'To solve big problems, you need to think beyond quick fixes.' },
        { scenario: 'zju', content: 'Think beyond your major to see how your knowledge applies to other fields.' },
        { scenario: 'design', content: 'Great designers think beyond the brief to anticipate future user needs.' },
      ]},
      { id: 'C140', phrase: 'think of', meaning: '想到 / 认为', examples: [
        { scenario: 'daily', content: 'When I think of relaxation, I think of sitting by the ocean.' },
        { scenario: 'zju', content: 'What do you think of the new grading system they\'re proposing?' },
        { scenario: 'design', content: 'We need to think of a simpler name for this feature.' },
      ]},
    ]
  },
  {
    id: 'V015', verb: 'Find', meaning: '发现 / 找到 / 觉得', frequencyRank: 15,
    collocations: [
      { id: 'C141', phrase: 'find a solution', meaning: '找到解决方案', examples: [
        { scenario: 'daily', content: 'We need to find a solution before the problem gets worse.' },
        { scenario: 'zju', content: 'The team worked together to find a solution to the experiment failure.' },
        { scenario: 'design', content: 'Finding a solution that works for all user types is the design challenge.' },
      ]},
      { id: 'C142', phrase: 'find out', meaning: '发现 / 弄清楚', examples: [
        { scenario: 'daily', content: 'I need to find out when the next train departs.' },
        { scenario: 'zju', content: 'I want to find out how other universities approach this research problem.' },
        { scenario: 'design', content: 'We need to find out why users are abandoning the cart at this step.' },
      ]},
      { id: 'C143', phrase: 'find it difficult', meaning: '发现很困难', examples: [
        { scenario: 'daily', content: 'I find it difficult to say no to people sometimes.' },
        { scenario: 'zju', content: 'Many students find it difficult to adapt to the self-directed learning style.' },
        { scenario: 'design', content: 'Users find it difficult to understand the difference between the two options.' },
      ]},
      { id: 'C144', phrase: 'find time', meaning: '抽出时间', examples: [
        { scenario: 'daily', content: 'It\'s hard to find time for hobbies with a busy schedule.' },
        { scenario: 'zju', content: 'I always find time to review my notes after each lecture.' },
        { scenario: 'design', content: 'We need to find time to do proper research before the design phase.' },
      ]},
      { id: 'C145', phrase: 'find a way', meaning: '找到方法', examples: [
        { scenario: 'daily', content: 'There\'s always a way to find a way if you\'re determined enough.' },
        { scenario: 'zju', content: 'We need to find a way to present complex data in a simple format.' },
        { scenario: 'design', content: 'We need to find a way to guide users without using too much text.' },
      ]},
      { id: 'C146', phrase: 'find common ground', meaning: '找到共同点', examples: [
        { scenario: 'daily', content: 'Despite our differences, we found common ground on the important things.' },
        { scenario: 'zju', content: 'During group projects, it\'s important to find common ground on the direction.' },
        { scenario: 'design', content: 'Finding common ground between client needs and user needs is key to good design.' },
      ]},
      { id: 'C147', phrase: 'find inspiration', meaning: '找到灵感', examples: [
        { scenario: 'daily', content: 'I find inspiration for writing in the most unexpected places.' },
        { scenario: 'zju', content: 'I found inspiration for my thesis in an old paper from the 1970s.' },
        { scenario: 'design', content: 'Designers often find inspiration in nature, art, and other industries.' },
      ]},
      { id: 'C148', phrase: 'find it helpful', meaning: '觉得有用 / 发现很有帮助', examples: [
        { scenario: 'daily', content: 'I find it helpful to write down my thoughts before a difficult conversation.' },
        { scenario: 'zju', content: 'Many students find it helpful to form a study group before exams.' },
        { scenario: 'design', content: 'Users find it helpful when the app remembers their preferences.' },
      ]},
      { id: 'C149', phrase: 'find value in', meaning: '在...中发现价值', examples: [
        { scenario: 'daily', content: 'I find value in taking long walks without any devices.' },
        { scenario: 'zju', content: 'I find value in attending optional lectures—they often give the best insights.' },
        { scenario: 'design', content: 'Users need to find immediate value in the product within the first minute.' },
      ]},
      { id: 'C150', phrase: 'find the problem', meaning: '找到问题所在', examples: [
        { scenario: 'daily', content: 'The mechanic took an hour to find the problem with my car.' },
        { scenario: 'zju', content: 'Finding the root of the problem in data analysis is more important than the solution.' },
        { scenario: 'design', content: 'User testing helps us find the problem before the product is launched.' },
      ]},
    ]
  },
  {
    id: 'V016', verb: 'Tell', meaning: '告诉 / 区分 / 说', frequencyRank: 16,
    collocations: [
      { id: 'C151', phrase: 'tell the difference', meaning: '区分 / 辨别', examples: [
        { scenario: 'daily', content: 'Can you tell the difference between these two wines?' },
        { scenario: 'zju', content: 'As you read more, you\'ll be able to tell the difference between good and bad arguments.' },
        { scenario: 'design', content: 'Users should be able to tell the difference between interactive and static elements.' },
      ]},
      { id: 'C152', phrase: 'tell a story', meaning: '讲故事 / 叙述', examples: [
        { scenario: 'daily', content: 'She can tell a story in a way that keeps everyone at the edge of their seats.' },
        { scenario: 'zju', content: 'A strong thesis tells a coherent story from the first chapter to the last.' },
        { scenario: 'design', content: 'Great products tell a story that users connect with emotionally.' },
      ]},
      { id: 'C153', phrase: 'tell the truth', meaning: '说实话', examples: [
        { scenario: 'daily', content: 'It\'s always better to tell the truth, even when it\'s uncomfortable.' },
        { scenario: 'zju', content: 'In academic writing, tell the truth about your findings—even if they\'re not what you expected.' },
        { scenario: 'design', content: 'Good user testing tells the truth about how people actually use a product.' },
      ]},
      { id: 'C154', phrase: 'tell apart', meaning: '区分 / 辨别', examples: [
        { scenario: 'daily', content: 'The twins look so alike that I can\'t tell them apart.' },
        { scenario: 'zju', content: 'Without reading the labels, I couldn\'t tell apart the control and test groups.' },
        { scenario: 'design', content: 'The buttons are too similar—users can\'t tell them apart easily.' },
      ]},
      { id: 'C155', phrase: 'tell from experience', meaning: '凭经验判断 / 经验告诉我', examples: [
        { scenario: 'daily', content: 'I can tell from experience that rushing a project never ends well.' },
        { scenario: 'zju', content: 'I can tell from experience that starting a thesis early reduces stress significantly.' },
        { scenario: 'design', content: 'I can tell from experience that users always interact with a product differently than expected.' },
      ]},
      { id: 'C156', phrase: 'tell at a glance', meaning: '一眼看出 / 瞬间判断', examples: [
        { scenario: 'daily', content: 'I can tell at a glance if the food is fresh or not.' },
        { scenario: 'zju', content: 'A well-organized presentation lets the audience tell at a glance what the key points are.' },
        { scenario: 'design', content: 'Good dashboard design lets users tell at a glance what needs attention.' },
      ]},
      { id: 'C157', phrase: 'tell someone about', meaning: '告诉某人关于...', examples: [
        { scenario: 'daily', content: 'I can\'t wait to tell you about the amazing trip I just had.' },
        { scenario: 'zju', content: 'I told my advisor about my new research idea and she seemed interested.' },
        { scenario: 'design', content: 'We need to tell users about the new features in a clear and concise way.' },
      ]},
      { id: 'C158', phrase: 'tell the reason', meaning: '说明原因 / 解释为什么', examples: [
        { scenario: 'daily', content: 'Please tell me the reason you were late today.' },
        { scenario: 'zju', content: 'In your introduction, tell the reader the reason you chose this research topic.' },
        { scenario: 'design', content: 'We should tell users the reason why we need their location data.' },
      ]},
      { id: 'C159', phrase: 'tell in advance', meaning: '提前告知', examples: [
        { scenario: 'daily', content: 'Please tell me in advance if you can\'t make it to dinner.' },
        { scenario: 'zju', content: 'The professor asks students to tell her in advance if they miss a class.' },
        { scenario: 'design', content: 'Good UX always tells users in advance about actions that can\'t be undone.' },
      ]},
      { id: 'C160', phrase: 'tell by', meaning: '通过...判断 / 从...可以看出', examples: [
        { scenario: 'daily', content: 'You can tell by her voice that she\'s excited about the news.' },
        { scenario: 'zju', content: 'You can tell by the quality of their references how deeply a student researched the topic.' },
        { scenario: 'design', content: 'You can tell by the bounce rate that users aren\'t finding what they need on this page.' },
      ]},
    ]
  },
  {
    id: 'V017', verb: 'Ask', meaning: '询问 / 请求 / 要求', frequencyRank: 17,
    collocations: [
      { id: 'C161', phrase: 'ask for help', meaning: '寻求帮助', examples: [
        { scenario: 'daily', content: 'Don\'t be afraid to ask for help when you need it.' },
        { scenario: 'zju', content: 'It\'s a sign of strength, not weakness, to ask for help in academic challenges.' },
        { scenario: 'design', content: 'Good designers ask for help when they are outside their area of expertise.' },
      ]},
      { id: 'C162', phrase: 'ask a question', meaning: '提问', examples: [
        { scenario: 'daily', content: 'If you\'re unsure, always ask a question rather than guessing.' },
        { scenario: 'zju', content: 'I always try to ask at least one question during every lecture.' },
        { scenario: 'design', content: 'In user interviews, asking the right question is more important than asking many questions.' },
      ]},
      { id: 'C163', phrase: 'ask for feedback', meaning: '请求反馈', examples: [
        { scenario: 'daily', content: 'I always ask for feedback after cooking a new dish for friends.' },
        { scenario: 'zju', content: 'Asking for feedback on your draft before the final submission is always a good idea.' },
        { scenario: 'design', content: 'We asked for feedback from ten users before finalizing the prototype.' },
      ]},
      { id: 'C164', phrase: 'ask for advice', meaning: '寻求建议', examples: [
        { scenario: 'daily', content: 'I asked for advice from a financial advisor before investing.' },
        { scenario: 'zju', content: 'When you\'re unsure about your thesis direction, ask for advice from your supervisor.' },
        { scenario: 'design', content: 'I asked for advice from experienced designers when I was stuck on the problem.' },
      ]},
      { id: 'C165', phrase: 'ask oneself', meaning: '自问 / 反思', examples: [
        { scenario: 'daily', content: 'Ask yourself whether this decision aligns with your long-term goals.' },
        { scenario: 'zju', content: 'Before starting your research, ask yourself what problem you are actually trying to solve.' },
        { scenario: 'design', content: 'Before adding a feature, always ask yourself: does this serve the user?' },
      ]},
      { id: 'C166', phrase: 'ask for permission', meaning: '请求许可', examples: [
        { scenario: 'daily', content: 'Always ask for permission before sharing someone else\'s photos online.' },
        { scenario: 'zju', content: 'You need to ask for permission before using copyrighted material in your paper.' },
        { scenario: 'design', content: 'The app should ask for permission in context, not all at once during onboarding.' },
      ]},
      { id: 'C167', phrase: 'ask for clarification', meaning: '请求澄清 / 要求说明', examples: [
        { scenario: 'daily', content: 'If you don\'t understand the instructions, ask for clarification.' },
        { scenario: 'zju', content: 'It\'s okay to ask for clarification during a lecture if something is unclear.' },
        { scenario: 'design', content: 'Before starting a project, ask for clarification on the requirements from the client.' },
      ]},
      { id: 'C168', phrase: 'ask the right questions', meaning: '问对问题', examples: [
        { scenario: 'daily', content: 'Asking the right questions helps you get useful answers when traveling.' },
        { scenario: 'zju', content: 'The key to great research is asking the right questions from the start.' },
        { scenario: 'design', content: 'Effective user interviews depend on asking the right questions in the right order.' },
      ]},
      { id: 'C169', phrase: 'ask in advance', meaning: '提前询问', examples: [
        { scenario: 'daily', content: 'Ask in advance whether there\'s a dress code for the event.' },
        { scenario: 'zju', content: 'Ask in advance if the lab equipment will be available for your experiment.' },
        { scenario: 'design', content: 'We should ask in advance how much technical knowledge our users have.' },
      ]},
      { id: 'C170', phrase: 'ask for support', meaning: '寻求支持', examples: [
        { scenario: 'daily', content: 'It takes courage to ask for support when you\'re going through a hard time.' },
        { scenario: 'zju', content: 'Students can ask for support from the mental health center on campus.' },
        { scenario: 'design', content: 'The team asked for support from the engineering department for the technical challenges.' },
      ]},
    ]
  },
  {
    id: 'V018', verb: 'Work', meaning: '工作 / 运作 / 努力', frequencyRank: 18,
    collocations: [
      { id: 'C171', phrase: 'work on', meaning: '致力于 / 努力改进', examples: [
        { scenario: 'daily', content: 'I\'m currently working on improving my public speaking skills.' },
        { scenario: 'zju', content: 'We are working on a joint research project with two other universities.' },
        { scenario: 'design', content: 'The team is working on a new iteration based on the latest user feedback.' },
      ]},
      { id: 'C172', phrase: 'work out', meaning: '解决 / 锻炼 / 算出', examples: [
        { scenario: 'daily', content: 'Everything worked out in the end, even though it was stressful.' },
        { scenario: 'zju', content: 'We need to work out the details of the experiment before submitting the proposal.' },
        { scenario: 'design', content: 'It took several sessions to work out a user flow that everyone agreed on.' },
      ]},
      { id: 'C173', phrase: 'work together', meaning: '合作 / 共同努力', examples: [
        { scenario: 'daily', content: 'If we work together, we can finish the project much faster.' },
        { scenario: 'zju', content: 'Students from different disciplines work together on interdisciplinary projects.' },
        { scenario: 'design', content: 'The design and engineering teams work together throughout the entire process.' },
      ]},
      { id: 'C174', phrase: 'work toward', meaning: '朝...努力', examples: [
        { scenario: 'daily', content: 'I\'m working toward saving enough money to study abroad.' },
        { scenario: 'zju', content: 'All our research is working toward finding a more sustainable energy source.' },
        { scenario: 'design', content: 'Every design decision should work toward improving the user experience.' },
      ]},
      { id: 'C175', phrase: 'work hard', meaning: '努力工作 / 勤奋', examples: [
        { scenario: 'daily', content: 'If you work hard and stay consistent, results will come.' },
        { scenario: 'zju', content: 'ZJU students are known for working hard and having high academic standards.' },
        { scenario: 'design', content: 'Even talented designers need to work hard and stay curious throughout their career.' },
      ]},
      { id: 'C176', phrase: 'work independently', meaning: '独立工作', examples: [
        { scenario: 'daily', content: 'I prefer to work independently because I can focus better on my own.' },
        { scenario: 'zju', content: 'Ph.D. students are expected to work independently with minimal guidance.' },
        { scenario: 'design', content: 'Freelance designers must be able to work independently and manage their own time.' },
      ]},
      { id: 'C177', phrase: 'work effectively', meaning: '高效工作', examples: [
        { scenario: 'daily', content: 'A good workspace setup helps me work effectively from home.' },
        { scenario: 'zju', content: 'Working effectively in a group requires clear roles and open communication.' },
        { scenario: 'design', content: 'Design systems help teams work effectively by providing reusable components.' },
      ]},
      { id: 'C178', phrase: 'work under pressure', meaning: '在压力下工作', examples: [
        { scenario: 'daily', content: 'I\'ve learned to work under pressure and still produce quality results.' },
        { scenario: 'zju', content: 'Exam season trains you to work under pressure and prioritize quickly.' },
        { scenario: 'design', content: 'In an agency, you often have to work under pressure to meet tight client deadlines.' },
      ]},
      { id: 'C179', phrase: 'work out a solution', meaning: '想出解决方案', examples: [
        { scenario: 'daily', content: 'We sat down and worked out a solution that everyone could agree on.' },
        { scenario: 'zju', content: 'The research team worked out a solution to the data inconsistency problem.' },
        { scenario: 'design', content: 'After three rounds of feedback, we finally worked out a solution for the navigation issue.' },
      ]},
      { id: 'C180', phrase: 'work from home', meaning: '在家工作', examples: [
        { scenario: 'daily', content: 'Working from home requires a lot of self-discipline.' },
        { scenario: 'zju', content: 'During the pandemic, many ZJU students had to study and work from home.' },
        { scenario: 'design', content: 'Many design teams now work from home using digital collaboration tools.' },
      ]},
    ]
  },
  {
    id: 'V019', verb: 'Feel', meaning: '感觉 / 感到', frequencyRank: 19,
    collocations: [
      { id: 'C181', phrase: 'feel confident', meaning: '感到自信', examples: [
        { scenario: 'daily', content: 'I feel confident when I\'m well prepared for a presentation.' },
        { scenario: 'zju', content: 'After practice, I started to feel confident speaking English in class.' },
        { scenario: 'design', content: 'A consistent design system helps the team feel confident about their decisions.' },
      ]},
      { id: 'C182', phrase: 'feel comfortable', meaning: '感到舒适 / 觉得自在', examples: [
        { scenario: 'daily', content: 'I finally feel comfortable in my new apartment after a month.' },
        { scenario: 'zju', content: 'It took me a semester to feel comfortable asking questions in class.' },
        { scenario: 'design', content: 'Users need to feel comfortable sharing their data with the app.' },
      ]},
      { id: 'C183', phrase: 'feel the pressure', meaning: '感受到压力', examples: [
        { scenario: 'daily', content: 'I feel the pressure to meet everyone\'s expectations sometimes.' },
        { scenario: 'zju', content: 'Many students feel the pressure of balancing academics and personal life at ZJU.' },
        { scenario: 'design', content: 'The team felt the pressure when the client moved the deadline up by a week.' },
      ]},
      { id: 'C184', phrase: 'feel motivated', meaning: '感到有动力', examples: [
        { scenario: 'daily', content: 'I feel motivated when I can see clear progress toward my goal.' },
        { scenario: 'zju', content: 'Joining a study group makes me feel more motivated to prepare for class.' },
        { scenario: 'design', content: 'Designers feel more motivated when they understand the impact of their work on users.' },
      ]},
      { id: 'C185', phrase: 'feel stuck', meaning: '感到卡住了 / 陷入困境', examples: [
        { scenario: 'daily', content: 'Sometimes I feel stuck in a routine and need a change.' },
        { scenario: 'zju', content: 'When I feel stuck on a problem, I take a break and come back with fresh eyes.' },
        { scenario: 'design', content: 'It\'s normal to feel stuck in the middle of a design project.' },
      ]},
      { id: 'C186', phrase: 'feel the difference', meaning: '感受到差异 / 发现不同', examples: [
        { scenario: 'daily', content: 'After one month of exercise, I started to feel the difference.' },
        { scenario: 'zju', content: 'After applying the feedback from my advisor, I could feel the difference in the quality of my writing.' },
        { scenario: 'design', content: 'After the redesign, users could immediately feel the difference in usability.' },
      ]},
      { id: 'C187', phrase: 'feel passionate about', meaning: '对...充满热情', examples: [
        { scenario: 'daily', content: 'I feel passionate about environmental issues and want to make a change.' },
        { scenario: 'zju', content: 'Choose a thesis topic you feel passionate about—it will sustain you through the hard parts.' },
        { scenario: 'design', content: 'The best designers feel passionate about solving real problems for real people.' },
      ]},
      { id: 'C188', phrase: 'feel responsible', meaning: '感到有责任', examples: [
        { scenario: 'daily', content: 'I feel responsible for the wellbeing of the people who depend on me.' },
        { scenario: 'zju', content: 'As the team leader, I feel responsible for everyone\'s performance in the project.' },
        { scenario: 'design', content: 'Designers should feel responsible for the accessibility and inclusivity of their products.' },
      ]},
      { id: 'C189', phrase: 'feel inspired', meaning: '感到受到启发', examples: [
        { scenario: 'daily', content: 'I feel inspired every time I visit an art museum.' },
        { scenario: 'zju', content: 'I left the lecture feeling inspired to explore a completely new research direction.' },
        { scenario: 'design', content: 'Visiting a design exhibition always makes me feel inspired and energized.' },
      ]},
      { id: 'C190', phrase: 'feel accomplished', meaning: '感到有成就感', examples: [
        { scenario: 'daily', content: 'I feel accomplished when I finish a long book or challenging project.' },
        { scenario: 'zju', content: 'Submitting my thesis made me feel accomplished in a way nothing else had before.' },
        { scenario: 'design', content: 'Seeing a product you designed being used by real people makes you feel accomplished.' },
      ]},
    ]
  },
  {
    id: 'V020', verb: 'Need', meaning: '需要 / 必须', frequencyRank: 20,
    collocations: [
      { id: 'C191', phrase: 'need to improve', meaning: '需要改进 / 有提升空间', examples: [
        { scenario: 'daily', content: 'I know I need to improve my listening skills in Chinese.' },
        { scenario: 'zju', content: 'My professor told me I need to improve the methodology section of my thesis.' },
        { scenario: 'design', content: 'The feedback showed us that we need to improve the onboarding experience.' },
      ]},
      { id: 'C192', phrase: 'need more time', meaning: '需要更多时间', examples: [
        { scenario: 'daily', content: 'I need more time to think about this decision carefully.' },
        { scenario: 'zju', content: 'I need more time to review all the reading materials before the seminar.' },
        { scenario: 'design', content: 'Complex design problems need more time than clients usually expect.' },
      ]},
      { id: 'C193', phrase: 'need to consider', meaning: '需要考虑', examples: [
        { scenario: 'daily', content: 'We need to consider all the options before making a final choice.' },
        { scenario: 'zju', content: 'The research team needs to consider the ethical implications of the study.' },
        { scenario: 'design', content: 'We need to consider how this design will work on different screen sizes.' },
      ]},
      { id: 'C194', phrase: 'need help', meaning: '需要帮助', examples: [
        { scenario: 'daily', content: 'If you need help, don\'t hesitate to ask—that\'s what I\'m here for.' },
        { scenario: 'zju', content: 'Many first-year students need help adjusting to university life.' },
        { scenario: 'design', content: 'If users need help too often, it signals a design problem, not a user problem.' },
      ]},
      { id: 'C195', phrase: 'need to focus', meaning: '需要专注', examples: [
        { scenario: 'daily', content: 'I need to focus on one task at a time to do my best work.' },
        { scenario: 'zju', content: 'During exam week, you need to focus and avoid unnecessary distractions.' },
        { scenario: 'design', content: 'We need to focus on the core user journey before adding extra features.' },
      ]},
      { id: 'C196', phrase: 'need to balance', meaning: '需要平衡', examples: [
        { scenario: 'daily', content: 'You need to balance work and rest to avoid burnout.' },
        { scenario: 'zju', content: 'Students at ZJU need to balance academic demands with personal wellbeing.' },
        { scenario: 'design', content: 'We need to balance innovation with usability in this redesign.' },
      ]},
      { id: 'C197', phrase: 'need practice', meaning: '需要练习', examples: [
        { scenario: 'daily', content: 'Playing piano well needs practice—there\'s no shortcut.' },
        { scenario: 'zju', content: 'Speaking in public needs practice, but it gets easier over time.' },
        { scenario: 'design', content: 'Sketching ideas quickly is a skill that needs practice to develop.' },
      ]},
      { id: 'C198', phrase: 'need to communicate', meaning: '需要沟通', examples: [
        { scenario: 'daily', content: 'In any relationship, you need to communicate openly and honestly.' },
        { scenario: 'zju', content: 'Group project members need to communicate regularly to stay aligned.' },
        { scenario: 'design', content: 'Designers need to communicate their ideas clearly to developers and clients.' },
      ]},
      { id: 'C199', phrase: 'need to develop', meaning: '需要发展 / 需要培养', examples: [
        { scenario: 'daily', content: 'We all need to develop better habits for long-term success.' },
        { scenario: 'zju', content: 'ZJU students need to develop both technical and soft skills to be competitive.' },
        { scenario: 'design', content: 'The company needs to develop a stronger design culture at the leadership level.' },
      ]},
      { id: 'C200', phrase: 'need clarification', meaning: '需要澄清 / 需要说明', examples: [
        { scenario: 'daily', content: 'I need clarification on the timeline before I can commit to anything.' },
        { scenario: 'zju', content: 'Students need clarification from the professor on the grading rubric.' },
        { scenario: 'design', content: 'The design brief needs clarification before the team can begin any work.' },
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

/** 为搭配随机匹配一个 IELTS 主题语境，便于覆盖雅思考题 */
export function getIELTSContextForPhrase(phrase: string): string {
  const theme = IELTS_THEMES[Math.floor(Math.random() * IELTS_THEMES.length)];
  return `在「${theme}」主题下，用搭配 "${phrase}" 造一个完整的英文句子（母语者日常会说的说法）`;
}
