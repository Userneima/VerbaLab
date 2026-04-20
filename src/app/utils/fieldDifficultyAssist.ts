export type FieldQuestion = {
  id: string;
  part: number;
  topic: string;
  question: string;
};

export type FieldDifficultyAssist = {
  outlineZh: string[];
  sentenceStems: string[];
  keySentence: string;
  keySentenceZh: string;
};

const QUESTION_ASSISTS: Record<string, FieldDifficultyAssist> = {
  Q001: {
    outlineZh: [
      '先说你通常怎么开始一天。',
      '再说白天最常做的几件事。',
      '最后点出一天里最有挑战的部分和原因。',
    ],
    sentenceStems: [
      'I usually start my day by ...',
      'The most challenging part is ...',
      "That's mainly because ...",
    ],
    keySentence:
      'The most challenging part of my day is staying focused when I have too many things to finish.',
    keySentenceZh: '我一天里最有挑战的部分，是在事情太多时还要保持专注。',
  },
  Q002: {
    outlineZh: [
      '先直接说你有什么爱好。',
      '再补一句你是怎么开始接触它的。',
      '最后说这个爱好为什么能一直坚持。',
    ],
    sentenceStems: [
      'One of my main hobbies is ...',
      'I got started with it when ...',
      'I still enjoy it because ...',
    ],
    keySentence:
      'I got into this hobby because it helps me relax and gives me a sense of progress.',
    keySentenceZh: '我开始这个爱好，是因为它既能让我放松，也能让我感受到进步。',
  },
  Q003: {
    outlineZh: [
      '先说你平时准备考试或重要任务的大体方法。',
      '再讲你最固定的一两个步骤。',
      '最后说这些方法为什么对你有效。',
    ],
    sentenceStems: [
      'I usually prepare by ...',
      'One thing I always do is ...',
      'It works for me because ...',
    ],
    keySentence:
      'I usually prepare by making a simple plan first, so I know what to focus on each day.',
    keySentenceZh: '我通常会先做一个简单计划，这样我就知道每天该重点做什么。',
  },
  Q004: {
    outlineZh: [
      '先说这个人是谁，以及你怎么认识他/她。',
      '再补一两个具体特点或经历。',
      '最后说你为什么欣赏这个人。',
    ],
    sentenceStems: [
      'A person I really admire is ...',
      'I got to know this person through ...',
      'What I admire most is ...',
    ],
    keySentence:
      'What I admire most is that this person stays calm under pressure and still helps other people.',
    keySentenceZh: '我最欣赏的是，这个人在压力下仍然能保持冷静，还会帮助别人。',
  },
  Q005: {
    outlineZh: [
      '先说你遇到的挑战是什么。',
      '再说当时为什么会觉得难。',
      '最后讲你是怎么处理并走出来的。',
    ],
    sentenceStems: [
      'One challenge I faced was ...',
      'It was difficult because ...',
      'I dealt with it by ...',
    ],
    keySentence:
      'I got through that challenge by breaking the problem into smaller steps and dealing with them one by one.',
    keySentenceZh: '我能熬过那个挑战，是因为我把问题拆成了更小的步骤，再一个个去处理。',
  },
  Q006: {
    outlineZh: [
      '先说你想学的技能是什么。',
      '再说你为什么想学它。',
      '最后讲你准备怎么开始学。',
    ],
    sentenceStems: [
      'A skill I would like to learn is ...',
      'I want to learn it because ...',
      'I plan to start by ...',
    ],
    keySentence:
      'I want to learn this skill because it would make me more confident and useful in real situations.',
    keySentenceZh: '我想学这个技能，是因为它会让我在真实场景里更自信，也更有用。',
  },
  Q007: {
    outlineZh: [
      '先明确表态：更好还是更差。',
      '再给一个最核心的原因。',
      '最后补一个现实里的例子或对比。',
    ],
    sentenceStems: [
      'I think technology has made communication ...',
      'One main reason is that ...',
      'For example, ...',
    ],
    keySentence:
      'I think technology has made communication better because people can stay connected much more easily than before.',
    keySentenceZh: '我觉得科技让沟通变得更好了，因为人们比以前更容易保持联系。',
  },
  Q008: {
    outlineZh: [
      '先直接说这件事重不重要。',
      '再说明学生为什么需要这种能力。',
      '最后补一个学习或生活中的例子。',
    ],
    sentenceStems: [
      'I think problem-solving skills are ...',
      'Students need them because ...',
      'For instance, ...',
    ],
    keySentence:
      'Problem-solving skills are important because students will face new situations that cannot be solved by memorizing facts alone.',
    keySentenceZh: '解决问题的能力很重要，因为学生会遇到很多光靠背知识解决不了的新情况。',
  },
  Q009: {
    outlineZh: [
      '先回答你喜不喜欢旅行。',
      '再说一个想去的地方。',
      '最后解释你为什么想去那里。',
    ],
    sentenceStems: [
      'Yes, I really enjoy traveling because ...',
      'One place I would like to visit is ...',
      'I want to go there because ...',
    ],
    keySentence:
      'I would like to go there because I want to experience a different pace of life and see something new.',
    keySentenceZh: '我想去那里，因为我想体验一种不同的生活节奏，也想看看新的东西。',
  },
  Q010: {
    outlineZh: [
      '先说这个地方在哪里。',
      '再说你为什么去那里。',
      '最后讲你觉得它最有意思的地方是什么。',
    ],
    sentenceStems: [
      'An interesting place I visited was ...',
      'I went there because ...',
      'What impressed me most was ...',
    ],
    keySentence:
      'What impressed me most was how the place combined a relaxing atmosphere with a strong local character.',
    keySentenceZh: '最打动我的是，这个地方既让人放松，又很有本地特色。',
  },
};

function buildFallbackAssist(question: FieldQuestion): FieldDifficultyAssist {
  if (question.part === 1) {
    return {
      outlineZh: ['先直接回答问题。', '再补一个最自然的原因。', '最后给一个你自己的小例子。'],
      sentenceStems: ['In my case, ...', 'I think so because ...', 'For example, ...'],
      keySentence:
        'In my case, the main reason is that this fits naturally into my daily life.',
      keySentenceZh: '对我来说，最主要的原因是这件事很自然地融入了我的日常生活。',
    };
  }
  if (question.part === 2) {
    return {
      outlineZh: ['先交代人物或事情是什么。', '再补背景和细节。', '最后说为什么这件事值得讲。'],
      sentenceStems: ['I would like to talk about ...', 'What happened was ...', 'The reason it stands out is ...'],
      keySentence:
        'What stands out most is that this experience taught me something practical about myself.',
      keySentenceZh: '最让我印象深刻的是，这段经历让我对自己有了一个很实际的认识。',
    };
  }
  return {
    outlineZh: ['先表明立场。', '再给一个核心理由。', '最后用例子或对比把观点撑住。'],
    sentenceStems: ['Personally, I think ...', 'The main reason is that ...', 'A good example would be ...'],
    keySentence:
      'Personally, I think this matters because it affects how people make decisions in real life.',
    keySentenceZh: '我觉得这件事重要，是因为它会影响人们在现实生活里的判断和选择。',
  };
}

export function buildFieldDifficultyAssist(question: FieldQuestion): FieldDifficultyAssist {
  return QUESTION_ASSISTS[question.id] ?? buildFallbackAssist(question);
}
