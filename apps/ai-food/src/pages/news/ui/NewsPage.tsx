import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Send } from 'lucide-react';
import {
  NEWS_CHANGELOG,
  NewsReleaseCard,
} from '@/features/news';
import { entranceContainer, entranceListItem } from '@/shared/lib';
import { Button, SubpageShell } from '@/shared/ui';

const TELEGRAM_CHANNEL_URL = 'https://t.me/mk_develop_05';

export function NewsPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  return (
    <SubpageShell
      title="Новости"
      onBack={() => navigate('/settings')}
      actions={
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <a
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Send className="h-4 w-4" aria-hidden />
            Telegram
          </a>
        </Button>
      }
    >
      <motion.div
        className="space-y-4 pb-6"
        variants={entranceContainer(reducedMotion)}
        initial="hidden"
        animate="show"
      >
        {NEWS_CHANGELOG.map((release, index) => (
          <motion.div
            key={release.date}
            variants={entranceListItem(reducedMotion)}
            custom={index}
          >
            <NewsReleaseCard release={release} isLatest={index === 0} />
          </motion.div>
        ))}
      </motion.div>
    </SubpageShell>
  );
}
