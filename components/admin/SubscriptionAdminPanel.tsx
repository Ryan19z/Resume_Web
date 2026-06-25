"use client";

import { PlanComparisonTable } from "@/components/admin/PlanComparisonTable";
import { MANAGED_TIERS, SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";
import { PRIVACY_CHECKLIST_FOR_OPERATOR } from "@/lib/privacy-notices";
import Link from "next/link";
import type { SubscriptionTier } from "@/lib/subscription-types";
import { useCallback, useEffect, useMemo, useState } from "react";

type ListItem = {
  resumeId: string;
  createdAt: number | null;
  updatedAt: number | null;
  editUrl: string;
  viewUrl: string;
  subscription: {
    tier: SubscriptionTier;
    status: string;
    expiresAt: number | null;
    note?: string;
  } | null;
  usage: {
    monthKey: string;
    smartImport: number;
    aiParse: number;
  };
};

type GeneratedLinks = {
  resumeId: string;
  tierLabelZh: string;
  editUrl: string;
  viewUrl: string;
};

const STORAGE_KEY = "resume-space-admin-key";

type ListFilter = "all" | "managed" | "legacy" | "active" | "cancelled";

function isSubscriptionActive(sub: ListItem["subscription"]): boolean {
  if (!sub) return true;
  if (sub.status === "cancelled" || sub.status === "expired") return false;
  if (sub.expiresAt != null && sub.expiresAt <= Date.now()) return false;
  return sub.status === "active";
}

function tierLabelFor(item: ListItem): string {
  const sub = item.subscription;
  if (!sub) return "存量全开";
  return SUBSCRIPTION_PLANS[sub.tier]?.labelZh ?? sub.tier;
}

function statusLabelFor(item: ListItem): string {
  const sub = item.subscription;
  if (!sub) return "存量";
  if (sub.status === "cancelled") return "已停用";
  if (sub.status === "expired") return "已过期";
  if (sub.expiresAt != null && sub.expiresAt <= Date.now()) return "已过期";
  return "正常";
}

function matchesListFilter(item: ListItem, filter: ListFilter): boolean {
  const sub = item.subscription;
  switch (filter) {
    case "managed":
      return sub != null;
    case "legacy":
      return sub == null;
    case "active":
      return isSubscriptionActive(sub);
    case "cancelled":
      return sub?.status === "cancelled";
    default:
      return true;
  }
}

function matchesSearch(item: ListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    item.resumeId.toLowerCase().includes(q) ||
    (item.subscription?.note?.toLowerCase().includes(q) ?? false) ||
    item.editUrl.toLowerCase().includes(q)
  );
}

function formatDate(ms: number | null): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("zh-CN");
}

function daysLeft(ms: number | null): string {
  if (ms == null) return "未设到期";
  const d = Math.ceil((ms - Date.now()) / (24 * 60 * 60 * 1000));
  if (d < 0) return `已过期 ${Math.abs(d)} 天`;
  if (d === 0) return "今日到期";
  return `剩余 ${d} 天`;
}

function LinkCopyField({
  label,
  hint,
  value,
}: {
  label: string;
  hint: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{label}</span>
        <button
          type="button"
          onClick={copy}
          disabled={!value}
          className="shrink-0 rounded-full border border-line px-3 py-1 text-[11px] font-medium text-ink hover:bg-ink/[0.04] disabled:opacity-40"
        >
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <p className="text-[11px] text-ink-muted">{hint}</p>
      <textarea
        readOnly
        value={value}
        rows={2}
        className="w-full resize-none rounded-xl border border-line bg-paper px-3 py-2 font-mono text-[11px] leading-relaxed text-ink"
      />
    </div>
  );
}

export function SubscriptionAdminPanel() {
  const [adminKey, setAdminKey] = useState("");
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [tier, setTier] = useState<SubscriptionTier>("monthly");
  const [extendDays, setExtendDays] = useState("30");
  const [note, setNote] = useState("");
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLinks | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("managed");
  const [jumpId, setJumpId] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [customerPinEnabled, setCustomerPinEnabled] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) setAdminKey(saved);
  }, []);

  useEffect(() => {
    const days = SUBSCRIPTION_PLANS[tier].durationDays;
    if (days) setExtendDays(String(days));
  }, [tier]);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/subscriptions?adminKey=${encodeURIComponent(key)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        items?: ListItem[];
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setItems(data.items ?? []);
      sessionStorage.setItem(STORAGE_KEY, key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const selected = useMemo(
    () => items.find((x) => x.resumeId === selectedId) ?? null,
    [items, selectedId],
  );

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) => matchesListFilter(item, listFilter) && matchesSearch(item, searchQuery),
      ),
    [items, listFilter, searchQuery],
  );

  const stats = useMemo(() => {
    const legacy = items.filter((x) => !x.subscription).length;
    const managed = items.length - legacy;
    const active = items.filter((x) => isSubscriptionActive(x.subscription)).length;
    const cancelled = items.filter((x) => x.subscription?.status === "cancelled").length;
    return { total: items.length, legacy, managed, active, cancelled };
  }, [items]);

  const selectCustomer = useCallback((resumeId: string) => {
    setSelectedId(resumeId);
    setGeneratedLinks(null);
  }, []);

  useEffect(() => {
    if (selected?.subscription?.tier) {
      setTier(
        MANAGED_TIERS.includes(selected.subscription.tier as SubscriptionTier)
          ? (selected.subscription.tier as SubscriptionTier)
          : "monthly",
      );
      setNote(selected.subscription.note ?? "");
    }
  }, [selected]);

  useEffect(() => {
    if (!adminKey.trim() || !selectedId) {
      setCustomerPinEnabled(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(
          `/api/admin/link-security?adminKey=${encodeURIComponent(adminKey)}&resumeId=${encodeURIComponent(selectedId)}`,
          { cache: "no-store" },
        );
        const d = (await r.json()) as { ok?: boolean; pinEnabled?: boolean };
        if (!cancelled && d.ok) {
          setCustomerPinEnabled(Boolean(d.pinEnabled));
        }
      } catch {
        if (!cancelled) setCustomerPinEnabled(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adminKey, selectedId]);

  const provisionNewCustomer = async () => {
    if (!adminKey.trim()) return;
    setProvisioning(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          tier,
          extendDays: Number(extendDays) || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        resumeId?: string;
        tierLabelZh?: string;
        editUrl?: string;
        viewUrl?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setGeneratedLinks({
        resumeId: data.resumeId ?? "",
        tierLabelZh: data.tierLabelZh ?? SUBSCRIPTION_PLANS[tier].labelZh,
        editUrl: data.editUrl ?? "",
        viewUrl: data.viewUrl ?? "",
      });
      setSelectedId(data.resumeId ?? "");
      setMessage(data.message ?? "已生成客户链接。");
      await load(adminKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "开户失败");
    } finally {
      setProvisioning(false);
    }
  };

  const applyPlan = async () => {
    if (!adminKey.trim() || !selectedId) return;
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          resumeId: selectedId,
          tier,
          status: "active",
          extendDays: Number(extendDays) || undefined,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        editUrl?: string;
        viewUrl?: string;
        tierLabelZh?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setGeneratedLinks({
        resumeId: selectedId,
        tierLabelZh: data.tierLabelZh ?? SUBSCRIPTION_PLANS[tier].labelZh,
        editUrl: data.editUrl ?? selected?.editUrl ?? "",
        viewUrl: data.viewUrl ?? selected?.viewUrl ?? "",
      });
      setMessage(
        `已为 ${selectedId} 开通/续费「${data.tierLabelZh ?? SUBSCRIPTION_PLANS[tier].labelZh}」，链接不变，可直接发给客户。`,
      );
      await load(adminKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新失败");
    }
  };

  const jumpToCustomer = () => {
    const id = jumpId.trim();
    if (!id) return;
    const found = items.find((x) => x.resumeId === id);
    if (!found) {
      setError(`未找到 ${id}，请确认 ID 或切换筛选为「全部」。`);
      return;
    }
    setError(null);
    setListFilter("all");
    setSearchQuery("");
    selectCustomer(id);
    setMessage(`已定位到 ${id}`);
  };

  const setCustomerStatus = async (status: "active" | "cancelled") => {
    if (!adminKey.trim() || !selectedId) return;
    setActionBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          resumeId: selectedId,
          tier: selected?.subscription?.tier ?? "legacy",
          status,
          note: note.trim() || selected?.subscription?.note,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setMessage(
        status === "cancelled"
          ? `已停用 ${selectedId}，链接仍可打开但无法编辑/导入。`
          : `已恢复 ${selectedId} 为正常状态。`,
      );
      await load(adminKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActionBusy(false);
    }
  };

  const deleteCustomer = async () => {
    if (!adminKey.trim() || !selectedId) return;
    const label = selected?.subscription?.note ?? selectedId;
    const ok = window.confirm(
      `确定永久删除「${label}」？\n\nresumeId: ${selectedId}\n\n删除后 EditURL / ViewURL 立即失效，数据不可恢复。`,
    );
    if (!ok) return;

    setActionBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/subscriptions?adminKey=${encodeURIComponent(adminKey)}&resumeId=${encodeURIComponent(selectedId)}`,
        { method: "DELETE" },
      );
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setSelectedId("");
      setGeneratedLinks(null);
      setMessage(data.message ?? "已删除。");
      await load(adminKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    } finally {
      setActionBusy(false);
    }
  };

  const clearCustomerPin = async () => {
    if (!adminKey.trim() || !selectedId) return;
    if (
      !window.confirm(
        `确定清除「${selected?.subscription?.note ?? selectedId}」的编辑口令？\n\n系统无法查看原口令，清除后客户需用 EditURL 重新设置。`,
      )
    ) {
      return;
    }
    setActionBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/link-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          resumeId: selectedId,
          action: "clearAccessPin",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setCustomerPinEnabled(false);
      setMessage(data.message ?? "已清除编辑口令。");
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActionBusy(false);
    }
  };

  const rotateCustomerLinks = async () => {
    if (!adminKey.trim() || !selectedId) return;
    if (
      !window.confirm(
        "确定重置链接？旧 EditURL / ViewURL 将全部失效，需重新发给客户。",
      )
    ) {
      return;
    }
    setActionBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/link-security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminKey,
          resumeId: selectedId,
          action: "rotateTokens",
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        editUrl?: string;
        viewUrl?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      setGeneratedLinks({
        resumeId: selectedId,
        tierLabelZh:
          selected?.subscription?.tier != null
            ? (SUBSCRIPTION_PLANS[selected.subscription.tier]?.labelZh ??
              selected.subscription.tier)
            : "存量全开",
        editUrl: data.editUrl ?? "",
        viewUrl: data.viewUrl ?? "",
      });
      setMessage(data.message ?? "链接已重置。");
      await load(adminKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setActionBusy(false);
    }
  };

  const displayLinks = generatedLinks ?? (selected
    ? {
        resumeId: selected.resumeId,
        tierLabelZh: selected.subscription
          ? (SUBSCRIPTION_PLANS[selected.subscription.tier]?.labelZh ??
            selected.subscription.tier)
          : "存量全开",
        editUrl: selected.editUrl,
        viewUrl: selected.viewUrl,
      }
    : null);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        客户套餐管理
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
        客户付款后：选套餐 → 点击「生成链接并开通」或给老客户「保存并续期」。
        <strong className="font-medium text-ink">
          同一客户的 EditURL / ViewURL 长期不变
        </strong>
        ，升级月租/季租/年租只改后台权限，无需重新发链接。
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-4">
        <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-ink">管理员密钥</span>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
            placeholder="RESUME_SPACE_ADMIN_KEY"
          />
        </label>
        <button
          type="button"
          onClick={() => load(adminKey)}
          disabled={loading || !adminKey.trim()}
          className="rounded-full border border-line bg-paper px-5 py-2 text-sm font-medium text-ink disabled:opacity-50"
        >
          {loading ? "加载中…" : "刷新列表"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink">套餐功能对照表</h2>
        <p className="mt-1 text-sm text-ink-muted">
          与代码配置 `lib/subscription-plans.ts` 同步；当前表单选中：
          <span className="font-medium text-ink">
            {SUBSCRIPTION_PLANS[tier].labelZh}
          </span>
          。对客户只需看对照表两行：「简历导入总次数」与「AI 简历分析次数」。
        </p>
        <div className="mt-3 rounded-xl border border-line/80 bg-paper/60 px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
          <p className="font-medium text-ink">技术说明（给你自己看）</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>
              <strong className="font-medium text-ink">简历导入总次数</strong>
              ：无论 AI 还是规则引擎，只要上传并成功填入，都算 1 次。
            </li>
            <li>
              <strong className="font-medium text-ink">AI 简历分析</strong>
              ：各档均含 AI 次数（试用 5、月租 15、季租 40、年租 80/月）；走 DeepSeek 等，约 2 分/次。
            </li>
            <li>
              AI 用完后本档仍可规则引擎导入（若未超「简历导入总次数」）。
            </li>
          </ul>
        </div>
        <div className="mt-4">
          <PlanComparisonTable highlightTier={tier} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5">
          <h2 className="text-lg font-semibold text-ink">① 新客户付款 · 开户发链接</h2>
          <p className="mt-2 text-sm text-ink-muted">
            选套餐后一键创建空间并写入权限，生成 EditURL（客户编辑）与 ViewURL（HR 只读）。
          </p>
          <div className="mt-4 space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">套餐档位</span>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                className="rounded-xl border border-line bg-surface px-3 py-2"
              >
                {MANAGED_TIERS.map((t) => (
                  <option key={t} value={t}>
                    {SUBSCRIPTION_PLANS[t].labelZh}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">开通天数</span>
              <input
                type="number"
                min={1}
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">备注（客户名 / 收款方式）</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2"
                placeholder="如：张三 · 微信月租"
              />
            </label>
            <button
              type="button"
              onClick={provisionNewCustomer}
              disabled={provisioning || !adminKey.trim()}
              className="w-full rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-paper disabled:opacity-50"
            >
              {provisioning ? "正在生成…" : "生成链接并开通套餐"}
            </button>
            <p className="text-[11px] leading-relaxed text-ink-muted">
              访问口令由客户在编辑页自行设置：右下角「链接安全」。
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">② 老客户续费 · 换套餐</h2>
          <p className="mt-2 text-sm text-ink-muted">
            在下方列表选中客户，改套餐或续期天数后保存。链接保持不变。
          </p>
          {!selected ? (
            <p className="mt-4 text-sm text-ink-muted">请先在列表中选择一位客户。</p>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="font-mono text-[12px] text-ink-muted">{selected.resumeId}</p>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">套餐档位</span>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as SubscriptionTier)}
                  className="rounded-xl border border-line bg-paper px-3 py-2"
                >
                  {MANAGED_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {SUBSCRIPTION_PLANS[t].labelZh}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">续期天数</span>
                <input
                  type="number"
                  min={1}
                  value={extendDays}
                  onChange={(e) => setExtendDays(e.target.value)}
                  className="rounded-xl border border-line bg-paper px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">备注（客户名 / 收款方式）</span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-xl border border-line bg-paper px-3 py-2"
                  placeholder="如：张三 · 微信月租"
                />
              </label>
              <button
                type="button"
                onClick={applyPlan}
                disabled={actionBusy}
                className="w-full rounded-full border border-ink bg-paper px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
              >
                保存套餐并续期
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerStatus("cancelled")}
                  disabled={actionBusy || selected.subscription?.status === "cancelled"}
                  className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-[12px] font-medium text-amber-900 disabled:opacity-40"
                >
                  停用客户
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerStatus("active")}
                  disabled={
                    actionBusy ||
                    (selected.subscription?.status === "active" &&
                      isSubscriptionActive(selected.subscription))
                  }
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-[12px] font-medium text-emerald-900 disabled:opacity-40"
                >
                  恢复启用
                </button>
                <button
                  type="button"
                  onClick={deleteCustomer}
                  disabled={actionBusy}
                  className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-[12px] font-medium text-red-800 disabled:opacity-40"
                >
                  永久删除
                </button>
              </div>
              {selected.subscription ? (
                <p className="text-[11px] text-ink-muted">
                  当前状态：{statusLabelFor(selected)} · 到期：
                  {formatDate(selected.subscription.expiresAt)}
                </p>
              ) : (
                <p className="text-[11px] text-ink-muted">
                  当前：存量全开（未设 subscription）· 可「停用」或「永久删除」清理
                </p>
              )}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4">
                <p className="text-sm font-medium text-ink">链接与口令</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                  编辑口令由客户自行设置；系统仅存加密哈希，你无法查看或代设（不涉及窥探客户隐私）。
                  客户忘记口令时，可点「清除编辑口令」后让客户重设。
                </p>
                <p className="mt-2 text-[11px] text-ink-muted">
                  客户口令状态：
                  <span className="font-medium text-ink">
                    {customerPinEnabled === null
                      ? " 加载中…"
                      : customerPinEnabled
                        ? " 已启用"
                        : " 未启用"}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void clearCustomerPin()}
                    disabled={actionBusy || !customerPinEnabled}
                    className="rounded-full border border-amber-300 bg-paper px-4 py-2 text-[12px] font-medium text-amber-900 disabled:opacity-40"
                  >
                    清除编辑口令（客户忘记时用）
                  </button>
                  <button
                    type="button"
                    onClick={() => void rotateCustomerLinks()}
                    disabled={actionBusy}
                    className="rounded-full border border-line bg-paper px-4 py-2 text-[12px] font-medium text-ink disabled:opacity-40"
                  >
                    重置链接（泄露时用）
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {displayLinks ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold text-ink">客户链接（{displayLinks.tierLabelZh}）</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            resumeId: {displayLinks.resumeId} · 功能由后台套餐控制，链接本身不含「档位信息」。
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <LinkCopyField
              label="EditURL · 发给客户"
              hint="含 editToken，可编辑、导入、分享、看访问记录（视套餐而定）。"
              value={displayLinks.editUrl}
            />
            <LinkCopyField
              label="ViewURL · 发给 HR"
              hint="仅 viewToken，HR 只读浏览；首次打开有「查看说明」，不含编辑入口。"
              value={displayLinks.viewUrl}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-line">
        <div className="space-y-3 border-b border-line bg-paper/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-ink-muted">
              共 {stats.total} 条 · 已开户 {stats.managed} · 存量 {stats.legacy} ·
              正常 {stats.active} · 已停用 {stats.cancelled}
            </p>
            <p className="text-[11px] text-ink-muted">
              当前显示 {filteredItems.length} 条
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["managed", "已开户"],
                ["all", "全部"],
                ["legacy", "存量全开"],
                ["active", "正常"],
                ["cancelled", "已停用"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setListFilter(value)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                  listFilter === value
                    ? "bg-ink text-paper"
                    : "border border-line bg-surface text-ink hover:bg-ink/[0.04]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-ink">搜索 ID / 备注</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="r_xxx 或客户名"
                className="rounded-xl border border-line bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
              <span className="font-medium text-ink">粘贴 ID 定位</span>
              <input
                value={jumpId}
                onChange={(e) => setJumpId(e.target.value)}
                placeholder="r_xxxxxxxxxxxxxxxx"
                className="rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[12px]"
              />
            </label>
            <button
              type="button"
              onClick={jumpToCustomer}
              disabled={!jumpId.trim()}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
            >
              定位客户
            </button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-paper/80 text-[11px] uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-3 py-2">resumeId</th>
              <th className="px-3 py-2">套餐</th>
              <th className="px-3 py-2">状态</th>
              <th className="px-3 py-2">到期</th>
              <th className="px-3 py-2">本月用量</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const sub = item.subscription;
              const tierLabel = tierLabelFor(item);
              const active = isSubscriptionActive(sub);
              const statusLabel = statusLabelFor(item);
              return (
                <tr
                  key={item.resumeId}
                  onClick={() => selectCustomer(item.resumeId)}
                  className={`cursor-pointer border-t border-line/70 hover:bg-ink/[0.03] ${
                    selectedId === item.resumeId ? "bg-ink/[0.05]" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-[11px]">{item.resumeId}</td>
                  <td className="px-3 py-2">
                    <span className={active ? "text-ink" : "text-red-700"}>
                      {tierLabel}
                    </span>
                    {sub?.note ? (
                      <span className="block text-[11px] text-ink-muted">{sub.note}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    <span
                      className={
                        statusLabel === "正常"
                          ? "text-emerald-700"
                          : statusLabel === "存量"
                            ? "text-ink-muted"
                            : "text-red-700"
                      }
                    >
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[12px]">
                    {sub ? daysLeft(sub.expiresAt) : "—"}
                  </td>
                  <td className="px-3 py-2 text-[12px] text-ink-muted">
                    导入 {item.usage.smartImport} · AI {item.usage.aiParse}
                  </td>
                </tr>
              );
            })}
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-muted">
                  {items.length === 0
                    ? "暂无客户，请用上方「生成链接并开通套餐」创建第一位客户。"
                    : "没有符合筛选条件的客户，试试切换「全部」或清空搜索。"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-paper/50 p-5 text-sm text-ink-muted">
        <p className="font-semibold text-ink">向客户说明的隐私与数据要点</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] leading-relaxed">
          {PRIVACY_CHECKLIST_FOR_OPERATOR.zh.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-3 text-[12px]">
          <Link
            href="/privacy"
            className="font-semibold text-ink underline-offset-2 hover:underline"
          >
            查看用户隐私政策
          </Link>
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-paper/50 p-5 text-sm text-ink-muted">
        <p className="font-semibold text-ink">推荐操作流程</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>客户微信/支付宝付款</li>
          <li>本页选「月租 / 季租 / 年租」→ 点「生成链接并开通套餐」</li>
          <li>复制 EditURL 发给客户，ViewURL 留给 HR（或让客户自行分享）</li>
          <li>到期前收款 → 列表选中该客户 →「保存套餐并续期」（链接不用换）</li>
          <li>误开户 / 测试链接 →「停用客户」或「永久删除」；列表默认隐藏存量全开</li>
          <li>
            防编辑链接泄露：提醒客户在右下角「链接安全」为 EditURL 设口令（ViewURL 给 HR 无需口令）
          </li>
        </ol>
      </div>
    </div>
  );
}
