import { useDeleteWordRecord } from '../../../utils/db'
import Chapter from '../Chapter'
import { ErrorTable } from '../ErrorTable'
import { getRowsFromErrorWordData } from '../ErrorTable/columns'
import { ReviewDetail } from '../ReviewDetail'
import useErrorWordData from '../hooks/useErrorWords'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { currentChapterAtom, currentDictIdAtom, reviewModeInfoAtom } from '@/store'
import type { Dictionary } from '@/typings'
import range from '@/utils/range'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IcOutlineCollectionsBookmark from '~icons/ic/outline-collections-bookmark'
import MajesticonsPaperFoldTextLine from '~icons/majesticons/paper-fold-text-line'
import PajamasReviewList from '~icons/pajamas/review-list'

enum Tab {
  Chapters = 'chapters',
  Errors = 'errors',
  Review = 'review',
}

export default function DictDetail({ dictionary: dict }: { dictionary: Dictionary }) {
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [curTab, setCurTab] = useState<Tab>(Tab.Chapters)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const navigate = useNavigate()
  const { deleteWordRecord } = useDeleteWordRecord()
  const [reload, setReload] = useState(false)

  const chapter = useMemo(() => (dict.id === currentDictId ? currentChapter : 0), [currentChapter, currentDictId, dict.id])
  const { errorWordData, isLoading, error } = useErrorWordData(dict, reload)

  const tableData = useMemo(() => {
    return getRowsFromErrorWordData(errorWordData)
  }, [errorWordData])

  const onDelete = useCallback(
    async (word: string) => {
      await deleteWordRecord(word, dict.id)
      setReload((old) => !old)
    },
    [deleteWordRecord, dict.id],
  )

  const onChangeChapter = useCallback(
    (index: number) => {
      setCurrentDictId(dict.id)
      setCurrentChapter(index)
      setReviewModeInfo((old) => ({ ...old, isReviewMode: false }))
      navigate('/')
    },
    [dict.id, navigate, setCurrentChapter, setCurrentDictId, setReviewModeInfo],
  )

  const handleTabChange = useCallback(
    (value: Tab) => {
      if (value !== curTab) {
        setCurTab(value)
      }
    },
    [curTab],
  )

  return (
    <div className="flex min-w-0 flex-col rounded-2xl px-1 py-1 text-gray-800 dark:text-gray-300 sm:rounded-[4rem] sm:px-4 sm:py-3 sm:pl-5">
      <div className="text relative flex min-h-40 flex-col gap-2 pb-16 sm:h-40 sm:min-h-0 sm:pb-0">
        <h3 className="min-w-0 break-words pr-8 text-xl font-semibold leading-tight sm:pr-0 sm:text-2xl">{dict.name}</h3>
        <p className="mt-1">{dict.chapterCount} 章节</p>
        <p>共 {dict.length} 词</p>
        <p>{dict.description}</p>
        <div className="absolute bottom-0 left-0 right-0 overflow-x-auto sm:bottom-5 sm:left-auto sm:right-4">
          <ToggleGroup type="single" value={curTab} onValueChange={handleTabChange}>
            <ToggleGroupItem
              value={Tab.Chapters}
              disabled={curTab === Tab.Chapters}
              className={`${curTab === Tab.Chapters ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
            >
              <MajesticonsPaperFoldTextLine className="mr-1.5 text-gray-500" />
              章节选择
            </ToggleGroupItem>
            {errorWordData.length > 0 && (
              <>
                <ToggleGroupItem
                  value={Tab.Errors}
                  disabled={curTab === Tab.Errors}
                  className={`${curTab === Tab.Errors ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
                >
                  <IcOutlineCollectionsBookmark className="mr-1.5 text-gray-500" />
                  查看错题
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={Tab.Review}
                  disabled={curTab === Tab.Review}
                  className={`${curTab === Tab.Review ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
                >
                  <PajamasReviewList className="mr-1.5 text-gray-500" />
                  错题回顾
                </ToggleGroupItem>
              </>
            )}
          </ToggleGroup>
        </div>
      </div>
      <div className="flex pl-0">
        <Tabs value={curTab} className="h-[30rem] w-full ">
          <TabsContent value={Tab.Chapters} className="h-full ">
            <ScrollArea className="h-[30rem] ">
              <div className="flex w-full flex-wrap gap-3">
                {range(0, dict.chapterCount, 1).map((index) => (
                  <Chapter
                    key={`${dict.id}-${index}`}
                    index={index}
                    checked={chapter === index}
                    dictID={dict.id}
                    onChange={onChangeChapter}
                  />
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value={Tab.Errors} className="h-full">
            <ErrorTable data={tableData} isLoading={isLoading} error={error} onDelete={onDelete} />
          </TabsContent>
          <TabsContent value={Tab.Review} className="h-full">
            <ReviewDetail errorData={errorWordData} dict={dict} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
