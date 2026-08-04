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

  return (
    <Layout className="admin-layout">
      <Sider breakpoint="lg" collapsedWidth={0}>
        <div className="admin-logo">AI Food</div>
        <Menu
          items={menuItems}
          mode="inline"
          onClick={({ key }) => router.push(key)}
          selectedKeys={[pathname]}
          theme="dark"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Typography.Text strong>Панель управления</Typography.Text>
          <Button
            icon={<LogoutOutlined />}
            loading={isLoggingOut}
            onClick={handleLogout}
          >
            Выйти
          </Button>
        </Header>
        <Content className="admin-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
