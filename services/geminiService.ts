
import { GoogleGenAI, Type } from "@google/genai";
import { Reservation, Cabin } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeReservations = async (reservations: Reservation[], cabins: Cabin[]) => {
  if (!process.env.API_KEY) return "Configura tu API Key para ver análisis inteligentes.";

  const prompt = `
    Como asistente administrativo de Rancho Laguna Ita, analiza estas reservas:
    Cabañas: ${JSON.stringify(cabins.map(c => c.name))}
    Reservas actuales: ${JSON.stringify(reservations)}
    
    Proporciona un resumen breve (máximo 3 párrafos) sobre:
    1. Ocupación general.
    2. Cabañas con más demanda.
    3. Una sugerencia estratégica para mejorar las ventas o la gestión.
    Habla en español de forma profesional y amable.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la IA para el análisis.";
  }
};
