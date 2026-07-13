import { useState } from "react";
import { useQuery, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchLeadMeetings,
  createLeadMeeting,
  deleteLeadMeeting,
  syncMeetingToGoogleCalendar,
} from "@/services/crm";

export function useLeadMeetings(
  leadId: string | undefined,
  qc: QueryClient,
  confirm: any
) {
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 30,
    meeting_type: "call",
  });
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);

  const meetingsQ = useQuery({
    enabled: !!leadId,
    queryKey: ["lead-meetings", leadId],
    queryFn: () => fetchLeadMeetings(leadId!),
  });

  async function createMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!leadId) return;
    if (!meetingForm.title || !meetingForm.scheduled_at) {
      return toast.error("Preencha o título e o horário da reunião");
    }
    try {
      await createLeadMeeting({
        lead_id: leadId,
        title: meetingForm.title,
        description: meetingForm.description || null,
        scheduled_at: new Date(meetingForm.scheduled_at).toISOString(),
        duration_minutes: meetingForm.duration_minutes,
        meeting_type: meetingForm.meeting_type,
      });
      setMeetingForm({
        title: "",
        description: "",
        scheduled_at: "",
        duration_minutes: 30,
        meeting_type: "call",
      });
      setMeetingFormOpen(false);
      qc.invalidateQueries({ queryKey: ["lead-meetings", leadId] });
      toast.success("Reunião agendada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar reunião");
    }
  }

  async function deleteMeeting(meetingId: string) {
    if (!leadId) return;
    confirm({
      title: "Deletar Reunião",
      description: "Deseja cancelar esta reunião permanentemente?",
      variant: "destructive",
      onConfirm: async () => {
        try {
          await deleteLeadMeeting(meetingId);
          qc.invalidateQueries({ queryKey: ["lead-meetings", leadId] });
          toast.success("Reunião cancelada.");
        } catch (e) {
          toast.error("Falha ao cancelar reunião");
        }
      },
    });
  }

  async function syncMeetingToGoogle(meeting: any) {
    try {
      await syncMeetingToGoogleCalendar(meeting.id);
      qc.invalidateQueries({ queryKey: ["lead-meetings", leadId] });
      toast.success("Reunião sincronizada com o Google Calendar!");
    } catch (err: any) {
      toast.error(err.message || "Erro na sincronização");
    }
  }

  return {
    meetingForm,
    setMeetingForm,
    meetingFormOpen,
    setMeetingFormOpen,
    meetingsQ,
    createMeeting,
    deleteMeeting,
    syncMeetingToGoogle,
  };
}
