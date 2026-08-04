'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Form, Input, message, Typography } from 'antd';

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
        <Typography.Title level={2}>Вход в панель управления</Typography.Title>
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
