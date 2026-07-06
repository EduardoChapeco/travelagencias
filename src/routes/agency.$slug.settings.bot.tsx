import { createFileRoute } from '@tanstack/react-router';
import { BotCanvas } from '@/components/bot/BotCanvas';

export const Route = createFileRoute('/agency/$slug/settings/bot')({
  head: ({ context }: any) => ({ meta: [{ title: `Construtor de Chatbot · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: BotSettingsPage,
});

function BotSettingsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] px-4 md:px-6 py-4 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chatbot Visual Builder</h1>
          <p className="text-muted-foreground mt-2">
            Arraste e conecte os blocos para desenhar o roteiro de atendimento da sua agência no WhatsApp.
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full border rounded-[24px] overflow-hidden shadow-sm">
        <BotCanvas />
      </div>
    </div>
  );
}
