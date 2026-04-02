import { FlaskConical, History, RefreshCw, X } from 'lucide-react';
import { ChallengeInput } from '../components/lab/ChallengeInput';
import { FeedbackView } from '../components/lab/FeedbackView';
import { RecentActivityPanel } from '../components/lab/RecentActivityPanel';
import { ReferenceExamplesPanel } from '../components/lab/ReferenceExamplesPanel';
import { StuckAssistantPanel } from '../components/lab/StuckAssistantPanel';
import { useLabPageController } from './useLabPageController';

export function LabPage() {
  const vm = useLabPageController();
  return <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex flex-row items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 pr-2">
            <FlaskConical size={20} className="text-violet-600 shrink-0" />
            <h1 className="font-bold text-gray-800 text-base sm:text-lg">实验室 · 语法校验</h1>
            <span className="text-xs text-gray-400 hidden sm:inline">· 用搭配造句，AI 实时诊断</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative lg:hidden">
              <button type="button" onClick={() => vm.setMobileRecentOpen(v => !v)} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors touch-manipulation ${vm.mobileRecentOpen ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-100'}`}><History size={14} />最近</button>
              {vm.mobileRecentOpen && <>
                <button type="button" aria-label="关闭最近活动" className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => vm.setMobileRecentOpen(false)} />
                <div className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(calc(100vw-2rem),18rem)] max-h-[min(70vh,22rem)] flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden lg:hidden">
                  <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between shrink-0">
                    <span className="text-xs font-semibold text-gray-700">最近活动</span>
                    <button type="button" onClick={() => vm.setMobileRecentOpen(false)} className="p-1 rounded-md text-gray-500 hover:bg-gray-200/80" aria-label="关闭"><X size={16} /></button>
                  </div>
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden"><RecentActivityPanel corpus={vm.store.corpus} errorBank={vm.store.errorBank} stats={vm.store.stats} onOpenCorpus={vm.goCorpusSentence} onOpenError={vm.goErrorEntry} /></div>
                </div>
              </>}
            </div>
            <button type="button" onClick={vm.loadNew} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 touch-manipulation"><RefreshCw size={14} />换一题</button>
          </div>
        </div>
        <ChallengeInput phrase={vm.currentItem.collocation.phrase} meaning={vm.currentItem.collocation.meaning} verb={vm.currentItem.verb.verb} isLearned={vm.isLearned} contextStr={vm.contextStr} userInput={vm.userInput} submissionCount={vm.submissionCount} testState={vm.testState} onInputChange={vm.setUserInput} onKeyDown={vm.handleKeyDown} onSubmit={vm.handleSubmit} onOpenStuck={() => { vm.setLabStuckOpen(true); vm.setStuckSuggestion(null); }} onToggleRecording={vm.handleToggleRecording} speech={vm.speech} inputRef={vm.userInputRef} />
        {vm.labStuckOpen && <StuckAssistantPanel phrase={vm.currentItem.collocation.phrase} stuckInput={vm.stuckInput} stuckLoading={vm.stuckLoading} suggestion={vm.stuckSuggestion} onClose={() => { vm.setLabStuckOpen(false); vm.setStuckSuggestion(null); }} onInputChange={vm.setStuckInput} onSubmit={vm.handleLabStuck} onClearSuggestion={() => vm.setStuckSuggestion(null)} />}
        <FeedbackView testState={vm.testState} userInput={vm.userInput} showExamples={vm.showExamples} onToggleExamples={() => vm.setShowExamples(v => !v)} onLoadNew={vm.loadNew} onOpenStuck={() => { vm.setLabStuckOpen(true); vm.setStuckSuggestion(null); }} nativeSuggestion={vm.nativeSuggestion} onSaveNative={vm.saveNativeSuggestionToCorpus} errors={vm.errors} overallHint={vm.overallHint} expandedError={vm.expandedError} onToggleError={i => vm.setExpandedError(vm.expandedError === i ? null : i)} tutor={{ messages: vm.tutorMessages, input: vm.tutorInput, loading: vm.tutorLoading, error: vm.tutorError, onInputChange: vm.setTutorInput, onSend: vm.sendTutorMessage }} />
        {vm.showExamples && vm.testState === 'correct' && <ReferenceExamplesPanel collocationId={vm.currentItem.collocation.id} phrase={vm.currentItem.collocation.phrase} examples={vm.currentItem.collocation.examples} showLabTranslationGlobal={vm.showLabTranslationGlobal} clickedLabExampleKey={vm.clickedLabExampleKey} onToggleGlobalTranslation={() => vm.setShowLabTranslationGlobal(v => !v)} onToggleExample={key => vm.setClickedLabExampleKey(k => (k === key ? null : key))} />}
      </div>
    </div>
    <div className="hidden lg:flex w-64 shrink-0 border-l border-gray-100 bg-white flex-col overflow-hidden min-h-0">
      <div className="p-4 border-b border-gray-100 shrink-0"><h3 className="font-semibold text-gray-700 text-sm">最近活动</h3></div>
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden"><RecentActivityPanel corpus={vm.store.corpus} errorBank={vm.store.errorBank} stats={vm.store.stats} onOpenCorpus={vm.goCorpusSentence} onOpenError={vm.goErrorEntry} /></div>
    </div>
  </div>;
}

