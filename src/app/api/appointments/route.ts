import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type AppointmentBody = {
  firstName: unknown;
  lastName: unknown;
  phone: unknown;
  serviceType: unknown;
  date: unknown;
  time: unknown;
  notes?: unknown;
};

function normalizeWhatsappNumber(input: string): string {
  return input.replace(/[^\d]/g, '');
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AppointmentBody;

    const firstName = asNonEmptyString(body.firstName);
    const lastName = asNonEmptyString(body.lastName);
    const phone = asNonEmptyString(body.phone);
    const date = asNonEmptyString(body.date);
    const time = asNonEmptyString(body.time);
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const serviceType = body.serviceType === 'TATOUAGE' ? 'TATOUAGE' : body.serviceType === 'COIFFURE' ? 'COIFFURE' : null;

    if (!firstName || !lastName || !phone || !date || !time || !serviceType) {
      return NextResponse.json(
        { error: 'Prénom, nom, téléphone, date, heure et type de séance sont obligatoires.' },
        { status: 400 },
      );
    }

    if (!process.env.SALON_WHATSAPP_NUMBER) {
      return NextResponse.json(
        { error: 'Numéro WhatsApp du salon non configuré. Ajoute SALON_WHATSAPP_NUMBER.' },
        { status: 503 },
      );
    }

    const dateTime = new Date(`${date}T${time}:00`);
    if (Number.isNaN(dateTime.getTime())) {
      return NextResponse.json({ error: 'Date ou heure invalide.' }, { status: 400 });
    }
    if (dateTime.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Merci de choisir un créneau futur.' }, { status: 400 });
    }

    const assignedBarber = await prisma.barber.findFirst({
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true },
    });
    if (!assignedBarber) {
      return NextResponse.json(
        { error: 'Aucun coiffeur/tatoueur n’est configuré pour le moment.' },
        { status: 409 },
      );
    }

    const client = await prisma.client.upsert({
      where: { phone },
      create: { firstName, lastName, phone },
      update: { firstName, lastName },
    });

    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        barberId: assignedBarber.id,
        dateTime,
      },
      select: { id: true, dateTime: true },
    });

    const salonWhatsapp = normalizeWhatsappNumber(process.env.SALON_WHATSAPP_NUMBER);
    if (!salonWhatsapp) {
      return NextResponse.json(
        { error: 'Format invalide pour SALON_WHATSAPP_NUMBER.' },
        { status: 503 },
      );
    }

    const message = [
      '*Nouvelle reservation client*',
      `- Nom: ${firstName} ${lastName}`,
      `- Telephone: ${phone}`,
      `- Type de seance: ${serviceType}`,
      `- Date: ${date}`,
      `- Heure: ${time}`,
      `- Coiffeur/Tatoueur assigne: ${assignedBarber.firstName} ${assignedBarber.lastName}`,
      `- ID reservation: ${appointment.id}`,
      notes ? `- Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const whatsappUrl = `https://wa.me/${salonWhatsapp}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      appointmentId: appointment.id,
      whatsappUrl,
      message: 'Reservation enregistree. Envoi WhatsApp pret.',
    });
  } catch (error) {
    console.error('Appointment creation failed:', error);
    return NextResponse.json({ error: 'Impossible de creer la reservation.' }, { status: 500 });
  }
}
