### Task 4: Sidebar nav entry В«РџР»Р°С‚РµР¶РёВ»

**Files:**
- Modify: `apps/ai-web/src/components/AdminShell.tsx`

**Interfaces:**
- Produces: menu key `/admin/payments`, label В«РџР»Р°С‚РµР¶РёВ», header title В«РџР»Р°С‚РµР¶РёВ»
- Consumes: existing `menuItems` / `pageTitles` pattern

- [ ] **Step 1: Update AdminShell menu and titles**

In `apps/ai-web/src/components/AdminShell.tsx`:

1. Add import `WalletOutlined` from `@ant-design/icons` (keep `CreditCardOutlined` for РџРѕРґРїРёСЃРєРё).
2. Insert menu item between В«Р¦РµРЅС‹В» and В«РџРѕРґРїРёСЃРєРёВ»:

```tsx
const menuItems = [
  { icon: <BarChartOutlined />, key: '/admin', label: 'РћР±Р·РѕСЂ' },
  { icon: <TagsOutlined />, key: '/admin/pricing', label: 'Р¦РµРЅС‹' },
  { icon: <WalletOutlined />, key: '/admin/payments', label: 'РџР»Р°С‚РµР¶Рё' },
  {
    icon: <CreditCardOutlined />,
    key: '/admin/subscriptions',
    label: 'РџРѕРґРїРёСЃРєРё',
  },
];

const pageTitles: Record<string, string> = {
  '/admin': 'РћР±Р·РѕСЂ',
  '/admin/pricing': 'Р¦РµРЅС‹',
  '/admin/payments': 'РџР»Р°С‚РµР¶Рё',
  '/admin/subscriptions': 'РџРѕРґРїРёСЃРєРё',
};
```

- [ ] **Step 2: Type-check**

Run:

```bash
pnpm --filter ai-web type-check
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/components/AdminShell.tsx
git commit -m "$(cat <<'EOF'
feat(ai-web): add РџР»Р°С‚РµР¶Рё nav item to admin shell

EOF
)"
```

---

