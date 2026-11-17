import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, BUCKET, isDemo } from './supabase'
import { localEntity } from './localDb'

// Base44 の Entity API に近い薄いラッパー
function entity(table) {
  if (isDemo) return localEntity(table)
  return {
    async list(order = '-created_date') {
      const desc = order.startsWith('-')
      const col = order.replace(/^-/, '')
      const { data, error } = await supabase.from(table).select('*').order(col, { ascending: !desc })
      if (error) throw error
      return data
    },
    async filter(where, order = 'created_date') {
      const desc = order.startsWith('-')
      const col = order.replace(/^-/, '')
      let q = supabase.from(table).select('*')
      for (const [k, v] of Object.entries(where)) q = q.eq(k, v)
      const { data, error } = await q.order(col, { ascending: !desc })
      if (error) throw error
      return data
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select().single()
      if (error) throw error
      return data
    },
    async bulkCreate(rows) {
      const { data, error } = await supabase.from(table).insert(rows).select()
      if (error) throw error
      return data
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
  }
}

export const db = {
  Song: entity('songs'),
  SongFile: entity('song_files'),
  SongFolder: entity('song_folders'),
  Event: entity('events'),
  SchedulePoll: entity('schedule_polls'),
  PollResponse: entity('poll_responses'),
  Member: entity('members'),
  ExpenseAdjustment: entity('expense_adjustments'),
  BandSavingsAdjustment: entity('band_savings_adjustments'),
  BandSavings: entity('band_savings'),
}

// ---------- ファイルアップロード（Supabase Storage） ----------
export async function uploadFile(file, prefix = 'files') {
  if (isDemo) return { file_url: URL.createObjectURL(file), storage_path: null, file_size: file.size }
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${prefix}/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { file_url: data.publicUrl, storage_path: path, file_size: file.size }
}

export async function removeStorageFile(path) {
  if (!path || isDemo) return
  await supabase.storage.from(BUCKET).remove([path])
}

// ---------- React Query フック ----------
export function useList(key, fn) {
  return useQuery({ queryKey: [key], queryFn: fn })
}

export function useSongs() {
  return useList('songs', () => db.Song.list('-created_date'))
}
export function useSongFiles() {
  return useList('song_files', () => db.SongFile.list('created_date'))
}
export function useSongFolders() {
  return useList('song_folders', () => db.SongFolder.list('created_date'))
}
export function useEvents() {
  return useList('events', () => db.Event.list('date'))
}
export function usePolls() {
  return useList('schedule_polls', () => db.SchedulePoll.list('-created_date'))
}
export function usePollResponses() {
  return useList('poll_responses', () => db.PollResponse.list('created_date'))
}
export function useMembers() {
  return useList('members', () => db.Member.list('created_date'))
}
export function useExpenseAdjustments() {
  return useList('expense_adjustments', () => db.ExpenseAdjustment.list('event_date'))
}
export function useSavingsAdjustments() {
  return useList('band_savings_adjustments', () => db.BandSavingsAdjustment.list('month'))
}

// 更新後に関連キーを再取得する mutation
export function useAction(fn, invalidate = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: [k] })),
  })
}
