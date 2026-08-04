# Admin UI Polish (Dark Theme) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `apps/ai-web` admin feel like a full product console with Ant Design dark theme, denser layout, and better operational UX on existing pages — no new APIs.

**Architecture:** UI-only changes. Enable `theme.darkAlgorithm` in `AdminProviders`, align shell/CSS to dark surfaces, add a shared `PageHeader`, regroup Overview stats, polish Pricing, and add client-side status filter + pagination + summary on Subscriptions.

**Tech Stack:** Next.js 15 App Router, React 18, Ant Design 5, TanStack Query, TypeScript, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-05-admin-ui-polish-design.md`

## Global Constraints

- UI kit: **Ant Design 5** only (no shadcn, no chart libs).
- Theme: `theme.darkAlgorithm`; accent = **default Ant Design blue** (no custom primary token pack).
- No new admin routes, gateway endpoints, or Prisma changes.
- Subscription search keeps calling existing `users?q=…`; status filter and pagination are **client-side**.
- Subscription actions remain `activate` | `extend` | `revoke` only.
- Verification: `pnpm --filter ai-web type-check` + manual browser checks (no ai-web unit tests yet).
- Copy language: Russian UI strings as in current pages.
- Preserve existing nav paths: `/admin`, `/admin/pricing`, `/admin/subscriptions`, `/admin/login`.

## File structure

| Path | Responsibility |
|------|----------------|
| `apps/ai-web/src/components/AdminProviders.tsx` | Dark `ConfigProvider` theme |
| `apps/ai-web/src/app/globals.css` | Dark admin surfaces; login page bg |
| `apps/ai-web/src/components/PageHeader.tsx` | Shared title + subtitle + extra |
| `apps/ai-web/src/components/AdminShell.tsx` | Dark shell, logo, dynamic header title |
| `apps/ai-web/src/app/admin/login/page.tsx` | Login layout under dark theme |
| `apps/ai-web/src/app/admin/page.tsx` | Grouped overview stats |
| `apps/ai-web/src/app/admin/pricing/page.tsx` | Pricing page chrome polish |
| `apps/ai-web/src/app/admin/subscriptions/page.tsx` | Filter, summary, pagination |

---

### Task 1: Dark theme root + globals

**Files:**
- Modify: `apps/ai-web/src/components/AdminProviders.tsx`
- Modify: `apps/ai-web/src/app/globals.css`

**Interfaces:**
- Produces: All admin children under `ConfigProvider` with `theme.darkAlgorithm`
- Consumes: none

- [ ] **Step 1: Enable dark algorithm in AdminProviders**

Replace `apps/ai-web/src/components/AdminProviders.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { App, ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={ruRU} theme={{ algorithm: theme.darkAlgorithm }}>
        <App>{children}</App>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Update globals.css for dark admin surfaces**

Replace the admin-related and body/`main` sections in `apps/ai-web/src/app/globals.css` so the file becomes:

```css
* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  background: #141414;
  color: rgba(255, 255, 255, 0.85);
}

main {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #141414;
}

.landing {
  text-align: center;
}

.landing h1 {
  margin: 0;
  font-size: 48px;
}

.landing p {
  margin: 8px 0 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 18px;
}

.admin-layout {
  min-height: 100vh;
}

.admin-logo {
  height: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fff;
  line-height: 1.2;
}

.admin-logo-title {
  font-size: 18px;
  font-weight: 700;
}

.admin-logo-subtitle {
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.45);
}

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #141414 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: none;
}

.admin-content {
  padding: 24px;
  background: #141414;
  min-height: calc(100vh - 64px);
}

.admin-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-section-title {
  margin: 0 0 12px !important;
}

@media (max-width: 575px) {
  .admin-header,
  .admin-content {
    padding-right: 16px;
    padding-left: 16px;
  }
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/components/AdminProviders.tsx apps/ai-web/src/app/globals.css
git commit -m "feat(ai-web): enable Ant Design dark theme for admin"
```

---

### Task 2: PageHeader + AdminShell

**Files:**
- Create: `apps/ai-web/src/components/PageHeader.tsx`
- Modify: `apps/ai-web/src/components/AdminShell.tsx`

**Interfaces:**
- Consumes: dark CSS classes from Task 1 (`.admin-logo`, `.admin-header`, …)
- Produces:
  - `PageHeader({ title: string; subtitle?: string; extra?: React.ReactNode })`
  - Shell header title derived from pathname

- [ ] **Step 1: Create PageHeader**

Create `apps/ai-web/src/components/PageHeader.tsx`:

```tsx
import { Flex, Typography } from 'antd';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
};

export function PageHeader({ title, subtitle, extra }: PageHeaderProps) {
  return (
    <Flex align="flex-start" gap={16} justify="space-between" wrap="wrap">
      <div>
        <Typography.Title level={2} style={{ margin: 0 }}>
          {title}
        </Typography.Title>
        {subtitle ? (
          <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            {subtitle}
          </Typography.Paragraph>
        ) : null}
      </div>
      {extra ? <div>{extra}</div> : null}
    </Flex>
  );
}
```

- [ ] **Step 2: Update AdminShell**

Replace `apps/ai-web/src/components/AdminShell.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChartOutlined,
  CreditCardOutlined,
  LogoutOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';

const { Content, Header, Sider } = Layout;

const menuItems = [
  { icon: <BarChartOutlined />, key: '/admin', label: 'Обзор' },
  { icon: <TagsOutlined />, key: '/admin/pricing', label: 'Цены' },
  {
    icon: <CreditCardOutlined />,
    key: '/admin/subscriptions',
    label: 'Подписки',
  },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Обзор',
  '/admin/pricing': 'Цены',
  '/admin/subscriptions': 'Подписки',
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (pathname === '/admin/login') {
    return children;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } finally {
      router.push('/admin/login');
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  const selectedKey =
    menuItems.find((item) =>
      item.key === '/admin' ? pathname === '/admin' : pathname.startsWith(item.key),
    )?.key ?? '/admin';

  const headerTitle = pageTitles[selectedKey] ?? 'Панель управления';

  return (
    <Layout className="admin-layout">
      <Sider breakpoint="lg" collapsedWidth={0} theme="dark">
        <div className="admin-logo">
          <span className="admin-logo-title">AI Food</span>
          <span className="admin-logo-subtitle">Admin</span>
        </div>
        <Menu
          items={menuItems}
          mode="inline"
          onClick={({ key }) => router.push(key)}
          selectedKeys={[selectedKey]}
          theme="dark"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Typography.Text strong>{headerTitle}</Typography.Text>
          <Button
            icon={<LogoutOutlined />}
            loading={isLoggingOut}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Header>
        <Content className="admin-content">
          <div className="admin-page">{children}</div>
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: exit 0

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/components/PageHeader.tsx apps/ai-web/src/components/AdminShell.tsx
git commit -m "feat(ai-web): polish admin shell and shared page header"
```

---

### Task 3: Login page under dark theme

**Files:**
- Modify: `apps/ai-web/src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: dark `body`/`main` from Task 1; `AdminProviders` dark theme via admin layout
- Produces: unchanged login API contract

- [ ] **Step 1: Restyle login page**

Replace `apps/ai-web/src/app/admin/login/page.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input, Typography, message } from 'antd';

type LoginFormValues = {
  password: string;
};

type ErrorResponse = {
  error?: string;
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({ password }: LoginFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/login', {
        body: JSON.stringify({ password }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as ErrorResponse;
        throw new Error(result.error || 'Не удалось войти');
      }

      router.push('/admin');
      router.refresh();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : 'Не удалось войти',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main>
      {messageContextHolder}
      <Card style={{ maxWidth: 400, width: '100%' }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          AI Food Admin
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Вход в панель управления
        </Typography.Paragraph>
        <Form<LoginFormValues>
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ message: 'Введите пароль', required: true }]}
          >
            <Input.Password autoComplete="current-password" autoFocus />
          </Form.Item>
          <Button
            block
            htmlType="submit"
            loading={isSubmitting}
            type="primary"
          >
            Войти
          </Button>
        </Form>
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: exit 0

- [ ] **Step 3: Manual check**

Open `/admin/login`: dark background, dark card, form readable. Do not require a successful login if password unknown in this step — visual only is enough if credentials unavailable.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/login/page.tsx
git commit -m "feat(ai-web): align admin login with dark theme"
```

---

### Task 4: Overview grouped stats

**Files:**
- Modify: `apps/ai-web/src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `PageHeader` from Task 2; existing `adminApi('stats')` shape
- Produces: same stats fields rendered in three groups

- [ ] **Step 1: Rewrite overview page**

Replace `apps/ai-web/src/app/admin/page.tsx` with:

```tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type Stats = {
  usersTotal: number;
  activeSubscriptions: number;
  paymentsConfirmedCount: number;
  paymentsConfirmedSumKopecks: number;
  usageAnalyzeLast7Days: number;
  usageRefineLast7Days: number;
  usageAnalyzeLast30Days: number;
  usageRefineLast30Days: number;
};

const formatRubles = (kopecks: number) =>
  new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(kopecks / 100);

export default function AdminPage() {
  const { data, error, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi<Stats>('stats'),
  });

  return (
    <>
      <PageHeader
        subtitle="Сводка по пользователям, платежам и usage"
        title="Обзор"
      />
      {error ? (
        <Alert
          description={error.message}
          message="Не удалось загрузить статистику"
          showIcon
          type="error"
        />
      ) : null}

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Пользователи
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Всего пользователей"
                value={data?.usersTotal ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Активные подписки"
                value={data?.activeSubscriptions ?? 0}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Платежи
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Подтверждённые платежи"
                value={data?.paymentsConfirmedCount ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                formatter={() =>
                  data ? formatRubles(data.paymentsConfirmedSumKopecks) : '—'
                }
                loading={isLoading}
                title="Сумма платежей"
                value={data?.paymentsConfirmedSumKopecks ?? 0}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Typography.Title className="admin-section-title" level={4}>
          Usage
        </Typography.Title>
        <Row gutter={[16, 16]}>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Анализы за 7 дней"
                value={data?.usageAnalyzeLast7Days ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Уточнения за 7 дней"
                value={data?.usageRefineLast7Days ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Анализы за 30 дней"
                value={data?.usageAnalyzeLast30Days ?? 0}
              />
            </Card>
          </Col>
          <Col lg={6} md={8} sm={12} xs={24}>
            <Card size="small">
              <Statistic
                loading={isLoading}
                title="Уточнения за 30 дней"
                value={data?.usageRefineLast30Days ?? 0}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/admin/page.tsx
git commit -m "feat(ai-web): group admin overview stats by section"
```

---

### Task 5: Pricing page polish

**Files:**
- Modify: `apps/ai-web/src/app/admin/pricing/page.tsx`

**Interfaces:**
- Consumes: `PageHeader`; existing `adminApi('pricing')` GET/PUT
- Produces: unchanged pricing payload `{ durationDays, priceKopecks }`

- [ ] **Step 1: Rewrite pricing page chrome**

Replace `apps/ai-web/src/app/admin/pricing/page.tsx` with:

```tsx
'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  InputNumber,
  Space,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type Pricing = {
  priceKopecks: number;
  durationDays: number;
  source: 'db' | 'env';
};

type PricingFormValues = {
  priceRubles: number;
  durationDays: number;
};

export default function PricingPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<PricingFormValues>();
  const pricingQuery = useQuery({
    queryKey: ['admin', 'pricing'],
    queryFn: () => adminApi<Pricing>('pricing'),
  });
  const savePricing = useMutation({
    mutationFn: (values: PricingFormValues) =>
      adminApi<Pricing>('pricing', {
        body: JSON.stringify({
          durationDays: values.durationDays,
          priceKopecks: Math.round(values.priceRubles * 100),
        }),
        method: 'PUT',
      }),
    onSuccess: (pricing) => {
      queryClient.setQueryData(['admin', 'pricing'], pricing);
      message.success('Настройки цены сохранены');
    },
    onError: (error) => message.error(error.message),
  });

  useEffect(() => {
    if (pricingQuery.data) {
      form.setFieldsValue({
        durationDays: pricingQuery.data.durationDays,
        priceRubles: pricingQuery.data.priceKopecks / 100,
      });
    }
  }, [form, pricingQuery.data]);

  return (
    <>
      <PageHeader
        subtitle="Цена и срок подписки для оплаты"
        title="Цены"
      />
      {pricingQuery.error ? (
        <Alert
          description={pricingQuery.error.message}
          message="Не удалось загрузить настройки"
          showIcon
          type="error"
        />
      ) : null}
      <Card loading={pricingQuery.isLoading} style={{ maxWidth: 640 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text type="secondary">Источник настроек: </Typography.Text>
            <Tag color={pricingQuery.data?.source === 'db' ? 'success' : 'processing'}>
              {pricingQuery.data?.source === 'db'
                ? 'База данных'
                : 'Переменные окружения'}
            </Tag>
          </div>
          <Form<PricingFormValues>
            form={form}
            layout="vertical"
            onFinish={(values) => savePricing.mutate(values)}
            requiredMark={false}
          >
            <Form.Item
              label="Цена подписки, ₽"
              name="priceRubles"
              rules={[
                { message: 'Укажите цену', required: true },
                {
                  message: 'Цена должна быть больше нуля',
                  min: 0.01,
                  type: 'number',
                },
              ]}
            >
              <InputNumber
                min={0.01}
                precision={2}
                step={100}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item
              label="Срок подписки, дней"
              name="durationDays"
              rules={[
                { message: 'Укажите срок', required: true },
                {
                  message: 'Срок должен быть целым положительным числом',
                  min: 1,
                  type: 'integer',
                },
              ]}
            >
              <InputNumber min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Button
              htmlType="submit"
              loading={savePricing.isPending}
              type="primary"
            >
              Сохранить
            </Button>
          </Form>
        </Space>
      </Card>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add apps/ai-web/src/app/admin/pricing/page.tsx
git commit -m "feat(ai-web): polish admin pricing page chrome"
```

---

### Task 6: Subscriptions operational UX

**Files:**
- Modify: `apps/ai-web/src/app/admin/subscriptions/page.tsx`

**Interfaces:**
- Consumes: `PageHeader`; existing `users?q=` and subscription POST actions
- Produces: client-side `statusFilter: 'all' | 'active' | 'inactive'`; Table `pagination`; summary counts from filtered list

- [ ] **Step 1: Rewrite subscriptions page**

Replace `apps/ai-web/src/app/admin/subscriptions/page.tsx` with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import {
  App,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

import { PageHeader } from '@/components/PageHeader';
import { adminApi } from '@/lib/adminApi';

type SubscriptionAction = 'activate' | 'extend' | 'revoke';
type StatusFilter = 'all' | 'active' | 'inactive';

type User = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: 'none' | 'active' | 'canceled' | 'past_due';
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
};

type UsersResponse = {
  users: User[];
};

type ActionModal = {
  action: 'activate' | 'extend';
  user: User;
};

type ActionFormValues = {
  days?: number;
};

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(value))
    : '—';

export default function SubscriptionsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [modal, setModal] = useState<ActionModal | null>(null);
  const [form] = Form.useForm<ActionFormValues>();
  const usersQuery = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () =>
      adminApi<UsersResponse>(`users?q=${encodeURIComponent(query)}`),
  });
  const changeSubscription = useMutation({
    mutationFn: ({
      action,
      days,
      userId,
    }: {
      action: SubscriptionAction;
      days?: number;
      userId: string;
    }) =>
      adminApi<User>(`users/${encodeURIComponent(userId)}/subscription`, {
        body: JSON.stringify({
          action,
          ...(days === undefined ? {} : { days }),
        }),
        method: 'POST',
      }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<UsersResponse>(
        ['admin', 'users', query],
        (current) =>
          current
            ? {
                users: current.users.map((user) =>
                  user.id === updatedUser.id ? updatedUser : user,
                ),
              }
            : current,
      );
      message.success('Подписка обновлена');
      setModal(null);
      form.resetFields();
    },
    onError: (error) => message.error(error.message),
  });

  const filteredUsers = useMemo(() => {
    const users = usersQuery.data?.users ?? [];
    if (statusFilter === 'active') {
      return users.filter((user) => user.hasActiveSubscription);
    }
    if (statusFilter === 'inactive') {
      return users.filter((user) => !user.hasActiveSubscription);
    }
    return users;
  }, [statusFilter, usersQuery.data?.users]);

  const activeCount = useMemo(
    () => filteredUsers.filter((user) => user.hasActiveSubscription).length,
    [filteredUsers],
  );

  const openAction = (user: User, action: 'activate' | 'extend') => {
    form.resetFields();
    setModal({ action, user });
  };

  const submitAction = ({ days }: ActionFormValues) => {
    if (!modal) return;
    changeSubscription.mutate({
      action: modal.action,
      days,
      userId: modal.user.id,
    });
  };

  const columns: ColumnsType<User> = [
    {
      key: 'user',
      render: (_, user) => {
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
        return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>
              {name || user.username || user.telegramId}
            </Typography.Text>
            <Typography.Text type="secondary">
              {user.username ? `@${user.username} · ` : ''}
              Telegram ID: {user.telegramId}
            </Typography.Text>
          </Space>
        );
      },
      title: 'Пользователь',
    },
    {
      key: 'status',
      render: (_, user) => (
        <Tag color={user.hasActiveSubscription ? 'success' : 'default'}>
          {user.hasActiveSubscription ? 'Активна' : 'Не активна'}
        </Tag>
      ),
      title: 'Статус',
      width: 140,
    },
    {
      dataIndex: 'subscriptionExpiresAt',
      key: 'expiresAt',
      render: formatDate,
      title: 'Действует до',
      width: 180,
    },
    {
      fixed: 'right',
      key: 'actions',
      render: (_, user) => (
        <Space wrap>
          <Button onClick={() => openAction(user, 'activate')} size="small">
            Активировать
          </Button>
          <Button onClick={() => openAction(user, 'extend')} size="small">
            Продлить
          </Button>
          <Popconfirm
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            okText="Отозвать"
            onConfirm={() =>
              changeSubscription.mutate({
                action: 'revoke',
                userId: user.id,
              })
            }
            title="Отозвать подписку?"
          >
            <Button danger size="small">
              Отозвать
            </Button>
          </Popconfirm>
        </Space>
      ),
      title: 'Действия',
      width: 310,
    },
  ];

  return (
    <>
      <PageHeader
        subtitle="Поиск пользователей и управление подписками"
        title="Подписки"
      />
      <Flex gap={12} justify="space-between" vertical={false} wrap="wrap">
        <Space wrap>
          <Input.Search
            allowClear
            enterButton="Найти"
            onSearch={(value) => setQuery(value.trim())}
            placeholder="ID, Telegram ID или имя пользователя"
            style={{ maxWidth: 420, width: '100%' }}
          />
          <Segmented<StatusFilter>
            onChange={setStatusFilter}
            options={[
              { label: 'Все', value: 'all' },
              { label: 'Активные', value: 'active' },
              { label: 'Неактивные', value: 'inactive' },
            ]}
            value={statusFilter}
          />
        </Space>
        <Typography.Text type="secondary">
          Найдено {filteredUsers.length} · активных {activeCount}
        </Typography.Text>
      </Flex>
      <Table<User>
        columns={columns}
        dataSource={filteredUsers}
        loading={usersQuery.isLoading}
        locale={{
          emptyText: usersQuery.error
            ? usersQuery.error.message
            : 'Пользователи не найдены',
        }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего ${total}`,
        }}
        rowKey="id"
        scroll={{ x: 900 }}
        size="middle"
      />
      <Modal
        cancelText="Отмена"
        confirmLoading={changeSubscription.isPending}
        destroyOnHidden
        okText={modal?.action === 'extend' ? 'Продлить' : 'Активировать'}
        onCancel={() => setModal(null)}
        onOk={() => form.submit()}
        open={Boolean(modal)}
        title={
          modal?.action === 'extend'
            ? 'Продлить подписку'
            : 'Активировать подписку'
        }
      >
        <Form<ActionFormValues>
          form={form}
          layout="vertical"
          onFinish={submitAction}
        >
          <Form.Item
            label={
              modal?.action === 'extend'
                ? 'Количество дней'
                : 'Количество дней (необязательно)'
            }
            name="days"
            rules={[
              {
                message: 'Для продления укажите количество дней',
                required: modal?.action === 'extend',
              },
              {
                message: 'Введите целое положительное число',
                min: 1,
                type: 'integer',
              },
            ]}
          >
            <InputNumber
              min={1}
              placeholder={
                modal?.action === 'activate'
                  ? 'Срок по умолчанию'
                  : undefined
              }
              precision={0}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm --filter ai-web type-check`

Expected: exit 0

- [ ] **Step 3: Manual smoke (if admin password + gateway available)**

1. Login → dark shell.
2. Overview: three sections visible.
3. Pricing: source tag + save still works.
4. Subscriptions: search, segmented filter, pagination, activate/extend/revoke.
5. Narrow viewport: sider collapses; table horizontal scroll.

- [ ] **Step 4: Commit**

```bash
git add apps/ai-web/src/app/admin/subscriptions/page.tsx
git commit -m "feat(ai-web): add subscription filters pagination and summary"
```

---

## Plan self-review

**Spec coverage**

| Spec requirement | Task |
|------------------|------|
| `darkAlgorithm` in ConfigProvider | Task 1 |
| Dark shell / no white header | Tasks 1–2 |
| Logo + Admin subtitle | Task 2 |
| Header page title + logout | Task 2 |
| Dark login | Tasks 1 + 3 |
| Overview grouped stats + PageHeader | Task 4 |
| Pricing chrome + source tag | Task 5 |
| Subscriptions filter / summary / pagination | Task 6 |
| No new APIs / sections / charts | Global constraints |
| Manual verification | Tasks 3 + 6 |

**Placeholder scan:** none.

**Type consistency:** `PageHeader` props (`title`, `subtitle?`, `extra?`) match usage; `StatusFilter` and `User` shapes consistent within Task 6; pricing/stats API types unchanged from current app.
