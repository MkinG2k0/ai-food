'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChartOutlined,
  CreditCardOutlined,
  LogoutOutlined,
  TagsOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Typography } from 'antd';

const { Content, Header, Sider } = Layout;

const menuItems = [
  { icon: <BarChartOutlined />, key: '/admin', label: 'Обзор' },
  { icon: <TagsOutlined />, key: '/admin/pricing', label: 'Цены' },
  { icon: <WalletOutlined />, key: '/admin/payments', label: 'Платежи' },
  {
    icon: <CreditCardOutlined />,
    key: '/admin/subscriptions',
    label: 'Подписки',
  },
];

const pageTitles: Record<string, string> = {
  '/admin': 'Обзор',
  '/admin/pricing': 'Цены',
  '/admin/payments': 'Платежи',
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
