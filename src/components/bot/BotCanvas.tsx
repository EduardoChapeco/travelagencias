import { useCallback, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Save, MessageSquare, HelpCircle, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

// Custom Nodes can be defined here in the future
const initialNodes: Node[] = [
  { id: '1', position: { x: 250, y: 5 }, data: { label: 'Início (Mensagem Recebida)' }, type: 'input' },
  { id: '2', position: { x: 250, y: 100 }, data: { label: 'Menu Principal' } },
];
const initialEdges: Edge[] = [{ id: 'e1-2', source: '1', target: '2', animated: true }];

export function BotCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const addNode = (type: string) => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      position: { x: 300, y: 200 },
      data: { label: `Novo ${type}` },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = () => {
    const flow = { nodes, edges };
    // Here we will save the flow to public.chatbot_flows.definition via Supabase
    console.log("Saving flow:", flow);
    toast.success("Fluxo salvo com sucesso!");
  };

  return (
    <div className="w-full h-full flex flex-col bg-background border rounded-md overflow-hidden relative">
      <div className="p-4 border-b border-border bg-surface flex justify-between items-center z-10 shadow-sm">
        <h3 className="font-semibold">Construtor Visual de Chatbot</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => addNode('Mensagem')}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagem
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode('Condição')}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Condição
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode('Ação')}>
            <ArrowRightLeft className="w-4 h-4 mr-2" />
            Ação
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Salvar Fluxo
          </Button>
        </div>
      </div>
      
      <div className="flex-1 w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-slate-50 dark:bg-slate-900"
        >
          <MiniMap />
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}
