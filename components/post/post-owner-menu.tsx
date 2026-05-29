"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import {
  deleteCommunityPost,
  updateCommunityPost,
  type CommunityPostEdit,
} from "@/lib/community";
import { cn } from "@/lib/cn";

type PostOwnerMenuProps = {
  postId: string;
  initialTitle: string;
  initialBody: string;
  initialTags?: string[];
  initialCategory?: string;
  language?: "ko" | "en";
  // The caller decides ownership; the menu renders nothing when false.
  canManage: boolean;
  // "card" floats a compact button in the corner; "detail" sits inline.
  variant?: "card" | "detail";
  onDeleted?: () => void;
  onEdited?: (edits: CommunityPostEdit) => void;
};

// Author-only "•••" menu for a community post: edit (title / content / tags) via
// an inline modal, or delete with a confirm step. Both routes update the
// localStorage copy and sync database-backed posts through the community API.
export function PostOwnerMenu({
  postId,
  initialTitle,
  initialBody,
  initialTags,
  initialCategory,
  language = "en",
  canManage,
  variant = "card",
  onDeleted,
  onEdited,
}: PostOwnerMenuProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState((initialTags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const t = (ko: string, en: string) => (language === "ko" ? ko : en);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!canManage) return null;

  function openEditor() {
    setTitle(initialTitle);
    setBody(initialBody);
    setTags((initialTags ?? []).join(", "));
    setError(null);
    setEditing(true);
    setOpen(false);
  }

  function submitEdit() {
    const nextTitle = title.trim();
    const nextBody = body.trim();
    if (!nextTitle) {
      setError(t("제목을 입력하세요.", "Title is required."));
      return;
    }
    if (!nextBody) {
      setError(t("내용을 입력하세요.", "Content is required."));
      return;
    }
    setSaving(true);
    const edits: CommunityPostEdit = {
      title: nextTitle,
      body: nextBody,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    };
    if (initialCategory) edits.category = initialCategory;
    updateCommunityPost(postId, edits);
    onEdited?.(edits);
    setSaving(false);
    setEditing(false);
  }

  function handleDelete() {
    const confirmed = window.confirm(
      t(
        "이 글을 삭제할까요? 되돌릴 수 없습니다.",
        "Delete this post? This cannot be undone.",
      ),
    );
    if (!confirmed) return;
    deleteCommunityPost(postId);
    setOpen(false);
    onDeleted?.();
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        "pointer-events-auto relative z-[3]",
        variant === "card" ? "shrink-0" : "inline-flex",
      )}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("글 관리", "Manage post")}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-tint/10 bg-tint/[0.04] text-muted transition hover:border-accent/50 hover:text-ink"
      >
        <span aria-hidden className="text-base leading-none">⋯</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-md border border-tint/15 bg-background shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openEditor}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-ink transition hover:bg-tint/[0.06]"
          >
            {t("수정", "Edit")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleDelete}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10"
          >
            {t("삭제", "Delete")}
          </button>
        </div>
      ) : null}

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(false);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-tint/15 bg-background p-5 shadow-xl">
            <h2 className="text-base font-semibold text-ink">
              {t("글 수정", "Edit post")}
            </h2>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("제목", "Title")}
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(event) => setTitle(event.target.value)}
                value={title}
              />
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("내용", "Content")}
              </span>
              <textarea
                className="mt-2 min-h-40 w-full resize-y rounded-md border border-tint/10 bg-background px-3 py-2 text-sm leading-6 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(event) => setBody(event.target.value)}
                value={body}
              />
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {t("태그", "Tags")}
              </span>
              <input
                className="mt-2 h-11 w-full rounded-md border border-tint/10 bg-background px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30"
                onChange={(event) => setTags(event.target.value)}
                placeholder="BTC, ETF, Macro"
                value={tags}
              />
            </label>

            {error ? (
              <p className="mt-3 text-xs font-semibold text-rose-300">{error}</p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-tint/10 px-4 py-2 text-xs font-semibold text-muted transition hover:text-ink"
              >
                {t("취소", "Cancel")}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={submitEdit}
                className="rounded-md border border-accent/50 bg-accent/15 px-4 py-2 text-xs font-bold text-accent-ink transition hover:bg-accent/25 disabled:opacity-50"
              >
                {saving ? t("저장 중…", "Saving…") : t("저장", "Save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Detail-page wrapper: resolves the signed-in user, shows the menu only to the
// post's author, and navigates away after a delete / refreshes after an edit.
export function PostOwnerControls({
  postId,
  authorId,
  initialTitle,
  initialBody,
  initialTags,
  initialCategory,
  language = "en",
}: {
  postId: string;
  authorId: string | null;
  initialTitle: string;
  initialBody: string;
  initialTags?: string[];
  initialCategory?: string;
  language?: "ko" | "en";
}) {
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig || !authorId) return;
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsOwner(Boolean(data.user) && data.user?.id === authorId);
    });
    return () => {
      active = false;
    };
  }, [authorId]);

  return (
    <PostOwnerMenu
      postId={postId}
      initialTitle={initialTitle}
      initialBody={initialBody}
      initialTags={initialTags}
      initialCategory={initialCategory}
      language={language}
      canManage={isOwner}
      variant="detail"
      onDeleted={() => router.push("/community")}
      onEdited={() => router.refresh()}
    />
  );
}
