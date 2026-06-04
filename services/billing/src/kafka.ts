import { Kafka, Producer } from 'kafkajs';
import dotenv from 'dotenv';

dotenv.config();

const kafkaBrokers = process.env.KAFKA_BROKERS || 'localhost:9092';
const clientId = process.env.KAFKA_CLIENT_ID || 'netflix-billing-service';

let producer: Producer | null = null;

try {
  const kafka = new Kafka({
    clientId,
    brokers: kafkaBrokers.split(','),
  });
  producer = kafka.producer();
} catch (err) {
  console.warn('[Kafka Client] Initialization failed.', err);
}

export const connectKafka = async () => {
  if (!producer) return;
  try {
    await producer.connect();
    console.log('Connected to MSK Kafka Event Streaming Layer successfully.');
  } catch (err) {
    console.warn('[Kafka] Broker connection failed.', err);
    producer = null;
  }
};

export const emitEvent = async (topic: string, payload: any) => {
  const messageValue = JSON.stringify({
    eventId: `evt-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  if (producer) {
    try {
      await producer.send({
        topic,
        messages: [{ value: messageValue }],
      });
      console.log(`[Kafka Event Emitted] Topic: ${topic}, ID: ${JSON.parse(messageValue).eventId}`);
      return;
    } catch (err) {
      console.warn(`[Kafka Event Failed] Direct emission failed.`, err);
    }
  }

  console.log(`[Kafka Event Emitted (Local Simulation)] Topic: ${topic} - Data:`, JSON.stringify(payload));
};
