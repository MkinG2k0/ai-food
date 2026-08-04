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
