import { currentReleaseNotes } from '@/resources/releases'

export default function ReleaseNotes({ onAcknowledge, fromSettings }: { onAcknowledge: () => void; fromSettings: boolean }) {
  return (
    <div className="min-h-0 overflow-y-auto p-5 text-left sm:p-6">
      <ul className="space-y-5">
        {currentReleaseNotes.map(({ title, description }) => (
          <li key={title}>
            <h3 className="font-medium text-gray-800 dark:text-gray-100">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">{description}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-gray-100 pt-4 text-sm leading-6 text-gray-600 dark:border-gray-700 dark:text-gray-300">
        两个开关都在右上角齿轮的「默写设置」中；本说明可从设置底部的「本次更新」再次打开。
      </p>
      <div className="mt-5 flex justify-end">
        <button type="button" className="my-btn-primary" onClick={onAcknowledge}>
          {fromSettings ? '返回设置' : '知道了'}
        </button>
      </div>
    </div>
  )
}
