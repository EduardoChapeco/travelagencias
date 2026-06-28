import { createFileRoute } from '@tanstack/react-router';
import { BotCanvas } from '@/components/bot/BotCanvas';

export const Route = createFileRoute('/agency/$slug/settings/bot')({
  head: () => ({ meta: [{ title: 'Construtor de Chatbot · TravelOS' }] }),
  component: BotSettingsPage,
});

function BotSettingsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chatbot Visual Builder</h1>
          <p className="text-muted-foreground mt-2">
            Arraste e conecte os blocos para desenhar o roteiro de atendimento da sua agência no WhatsApp.
          </p>
        </div>
      </div>
      
      <div className="flex-1 w-full border rounded-xl overflow-hidden shadow-sm">
        <BotCanvas />
      </div>
    </div>
  );
}
