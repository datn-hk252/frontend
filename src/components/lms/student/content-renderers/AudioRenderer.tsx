"use client";

import { useState } from "react";
import { Headphones } from "lucide-react";
import { ContentItem, EmptyState, buildFileUrl, formatFileSize, DownloadLink } from "./utils";

interface AudioRendererProps {
  content: ContentItem;
}

/**
 * Listening material.
 *
 * Deliberately plain: the native player already gives seeking, speed and
 * volume, and a listening exercise is replayed constantly, so anything that
 * gets between the learner and the scrub bar is in the way. `preload="none"`
 * keeps a page of several tracks from pulling them all down at once.
 */
export function AudioRenderer({ content }: AudioRendererProps) {
  const [error, setError] = useState(false);

  const filePath = content.metadata?.file_path || content.file_path;
  const audioUrl = filePath ? buildFileUrl(filePath) : (content.metadata?.audio_url ?? "");

  if (!audioUrl) return <EmptyState message="Tệp âm thanh chưa được tải lên." />;

  const fileName = content.metadata?.file_name as string | undefined;
  const fileSize = content.metadata?.file_size as number | undefined;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {fileName || content.title}
            </p>
            {fileSize ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatFileSize(fileSize)}
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
            Không phát được tệp này. Hãy tải xuống để nghe bằng trình phát khác.
          </p>
        ) : (
          <audio
            controls
            preload="none"
            src={audioUrl}
            onError={() => setError(true)}
            className="w-full"
          >
            Trình duyệt của bạn không hỗ trợ phát âm thanh.
          </audio>
        )}
      </div>

      <DownloadLink
        href={audioUrl.replace("/serve/", "/download/")}
        label="Tải xuống"
        secondary
      />
    </div>
  );
}
