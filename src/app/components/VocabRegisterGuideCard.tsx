import type { VocabCardRegisterGuide } from '../store/useStore';

type VocabRegisterGuideCardProps = {
  headword: string;
  spokenPracticePhrase?: string;
  registerGuide?: VocabCardRegisterGuide;
  registerNoteZh?: string;
  spokenAlternatives?: string[];
  compact?: boolean;
};

function normalizeText(value?: string | null): string {
  return value?.trim() || '';
}

function resolveRegisterDisplay(input: {
  headword: string;
  spokenPracticePhrase?: string;
  registerGuide?: VocabCardRegisterGuide;
  registerNoteZh?: string;
  spokenAlternatives?: string[];
}) {
  const normalizedHeadword = normalizeText(input.headword).toLowerCase();
  const normalizedSpoken = normalizeText(input.spokenPracticePhrase).toLowerCase();
  const badContinuationPhrases = new Set(['keep going', 'carry on', 'keep it up', 'continue']);

  if (normalizedHeadword === 'perpetuate' && badContinuationPhrases.has(normalizedSpoken)) {
    return {
      headword: input.headword,
      spokenPracticePhrase: 'keep alive',
      registerNoteZh: 'perpetuate 指让有害的事长期延续；口语里更接近 keep alive，不是 keep going。',
      spokenAlternatives: ['keep alive', 'prop up', 'maintain'],
      registerGuide: {
        anchorZh: 'perpetuate = 使有害的事、观念或不公长期持续存在，极度正式，偏书面/学术语境。',
        alternatives: [
          { phrase: 'keep alive', labelZh: '日常口语', usageZh: '口语里表达“让坏东西一直存在”时更自然。' },
          { phrase: 'prop up', labelZh: '参考说法', usageZh: '更偏批评语气，强调硬撑着不好的东西。' },
          { phrase: 'maintain', labelZh: '参考说法', usageZh: '更中性，也可用于正式说明。' },
        ],
        compareExamples: {
          original: 'Stereotypes perpetuate harm.',
          spoken: 'Stereotypes keep harmful attitudes alive.',
        },
        pitfalls: ['别用 keep going 或 carry on，它们更像“人继续做某事”，和 perpetuate 不是一回事。'],
        coreCollocations: ['perpetuate stereotypes', 'perpetuate harm', 'perpetuate inequality'],
        tagHints: ['#v.', '#正式', '#书面', '#负面'],
      } satisfies VocabCardRegisterGuide,
    };
  }

  return {
    headword: input.headword,
    spokenPracticePhrase: input.spokenPracticePhrase,
    registerGuide: input.registerGuide,
    registerNoteZh: input.registerNoteZh,
    spokenAlternatives: input.spokenAlternatives,
  };
}

export function VocabRegisterGuideCard({
  headword,
  spokenPracticePhrase,
  registerGuide,
  registerNoteZh,
  spokenAlternatives,
  compact = false,
}: VocabRegisterGuideCardProps) {
  const resolved = resolveRegisterDisplay({
    headword,
    spokenPracticePhrase,
    registerGuide,
    registerNoteZh,
    spokenAlternatives,
  });
  const fallbackAlternatives = (resolved.spokenAlternatives || [])
    .map((phrase) => normalizeText(phrase))
    .filter(Boolean)
    .filter((phrase, index, arr) => arr.indexOf(phrase) === index);
  const alternatives: VocabCardRegisterGuide['alternatives'] = resolved.registerGuide?.alternatives?.length
    ? resolved.registerGuide.alternatives
    : fallbackAlternatives.map((phrase, index) => ({
        phrase,
        labelZh: index === 0 ? '日常口语' : '参考说法',
        usageZh: undefined,
      }));
  const pitfalls = resolved.registerGuide?.pitfalls || [];
  const collocations = resolved.registerGuide?.coreCollocations || [];
  const note = normalizeText(resolved.registerGuide?.anchorZh) || normalizeText(resolved.registerNoteZh);
  const compareExamples = resolved.registerGuide?.compareExamples;
  const hasDetailedAlternatives = alternatives.some((alt) => alt.usageZh);
  const showExpanded =
    !!note || hasDetailedAlternatives || !!compareExamples || pitfalls.length > 0 || collocations.length > 0;
  const rawAlternatives = alternatives.map((alt) => alt.phrase).filter(Boolean);
  return (
    <div className={`rounded-xl border border-violet-200 ring-1 ring-violet-100/80 bg-violet-50/20 ${compact ? 'p-2.5 sm:p-3' : 'p-3 sm:p-3.5'}`}>
      <div className="rounded-lg border border-gray-200 bg-white px-2.5 sm:px-3 py-3 space-y-2.5">
        {showExpanded ? (
          <div className="space-y-3.5">
            {note ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium tracking-wide text-gray-400">原词定位</p>
                <p className="text-[13px] sm:text-[14px] leading-relaxed text-gray-800">{note}</p>
              </div>
            ) : null}

            {hasDetailedAlternatives ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium tracking-wide text-gray-400">分档替换</p>
                <div className="space-y-1.5">
                  {alternatives
                    .filter((alt) => alt.usageZh)
                    .map((alt) => (
                      <p key={`${alt.labelZh}-${alt.phrase}-usage`} className="text-[12px] sm:text-[13px] leading-relaxed text-gray-600">
                        <span className="text-gray-500">{alt.labelZh}</span>
                        <span className="mx-1 text-gray-300">·</span>
                        <span className="font-medium text-gray-800">{alt.phrase}</span>
                        <span className="mx-1 text-gray-300">:</span>
                        {alt.usageZh}
                      </p>
                    ))}
                </div>
              </div>
            ) : null}

            {compareExamples ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium tracking-wide text-gray-400">例句对比</p>
                <div className="rounded-lg border border-gray-100 bg-slate-50/70 px-3 py-2.5 space-y-2">
                  <p className="text-[12.5px] sm:text-[13.5px] text-gray-800 leading-relaxed">
                    正式：<span className="text-gray-900">{compareExamples.original}</span>
                  </p>
                  <p className="text-[12.5px] sm:text-[13.5px] text-gray-800 leading-relaxed">
                    口语：<span className="text-gray-900">{compareExamples.spoken}</span>
                  </p>
                </div>
              </div>
            ) : null}

            {pitfalls.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium tracking-wide text-gray-400">避坑提示</p>
                <div className="space-y-1.5">
                  {pitfalls.map((pitfall) => (
                    <p key={pitfall} className="text-[12.5px] sm:text-[13.5px] leading-relaxed text-amber-900">
                      {pitfall}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {collocations.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] font-medium tracking-wide text-gray-400">目标搭配</p>
                <div className="flex flex-wrap gap-2">
                  {collocations.map((collocation) => (
                    <span
                      key={collocation}
                      className="text-[10.5px] sm:text-[11px] bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-100 font-medium"
                    >
                      {collocation}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {!showExpanded && rawAlternatives.length > 0 ? (
          <div className="space-y-1">
            <p className="text-[10px] font-medium tracking-wide text-gray-400">当前替换（待补全）</p>
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-gray-700">{rawAlternatives.join(' / ')}</p>
          </div>
        ) : null}
        {!showExpanded && rawAlternatives.length === 0 ? (
          <p className="text-[13px] sm:text-[14px] leading-relaxed text-gray-700">语体解析暂未生成完整。</p>
        ) : null}
      </div>
    </div>
  );
}
