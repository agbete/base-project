// ========================================
// WORKER POUR TÂCHES ASYNCHRONES
// ========================================

import Bull from 'bull';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';

// ========================================
// CONFIGURATION DES QUEUES
// ========================================

const redisConfig: any = {
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379'),
  db: parseInt(process.env['REDIS_DB'] || '0'),
};

// Ajouter le mot de passe seulement s'il est défini
if (process.env['REDIS_PASSWORD']) {
  redisConfig.password = process.env['REDIS_PASSWORD'];
}

// Queues pour différents types de tâches
const emailQueue = new Bull('email processing', { redis: redisConfig });
const notificationQueue = new Bull('notification processing', { redis: redisConfig });
const reportQueue = new Bull('report generation', { redis: redisConfig });
const cleanupQueue = new Bull('cleanup tasks', { redis: redisConfig });

// ========================================
// PROCESSEURS DE TÂCHES
// ========================================

// Traitement des emails
emailQueue.process('send-email', async (job) => {
  const { to, subject, template: _template, data: _data, companyId } = job.data;
  
  logger.info('Processing email job', {
    jobId: job.id,
    to,
    subject,
    companyId,
  });

  try {
    // TODO: Implémenter l'envoi d'email réel
    // await emailService.send({ to, subject, template, data });
    
    // Simulation pour le moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    logger.info('Email sent successfully', {
      jobId: job.id,
      to,
      subject,
    });

    return { success: true, sentAt: new Date() };
  } catch (error) {
    logger.error('Failed to send email', {
      jobId: job.id,
      to,
      subject,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

// Traitement des notifications
notificationQueue.process('send-notification', async (job) => {
  const { userId, type, title: _title, message: _message, data: _data, companyId } = job.data;
  
  logger.info('Processing notification job', {
    jobId: job.id,
    userId,
    type,
    companyId,
  });

  try {
    // TODO: Implémenter l'envoi de notification réel
    // await notificationService.send({ userId, type, title, message, data });
    
    // Simulation pour le moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    logger.info('Notification sent successfully', {
      jobId: job.id,
      userId,
      type,
    });

    return { success: true, sentAt: new Date() };
  } catch (error) {
    logger.error('Failed to send notification', {
      jobId: job.id,
      userId,
      type,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

// Génération de rapports
reportQueue.process('generate-report', async (job) => {
  const { reportType, filters: _filters, userId, companyId } = job.data;
  
  logger.info('Processing report generation job', {
    jobId: job.id,
    reportType,
    userId,
    companyId,
  });

  try {
    // TODO: Implémenter la génération de rapport réelle
    // const report = await reportService.generate({ reportType, filters, companyId });
    
    // Simulation pour le moment
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const reportUrl = `/reports/${job.id}.pdf`;
    
    logger.info('Report generated successfully', {
      jobId: job.id,
      reportType,
      reportUrl,
    });

    // Notifier l'utilisateur que le rapport est prêt
    await notificationQueue.add('send-notification', {
      userId,
      companyId,
      type: 'report-ready',
      title: 'Rapport prêt',
      message: `Votre rapport ${reportType} est maintenant disponible.`,
      data: { reportUrl },
    });

    return { success: true, reportUrl, generatedAt: new Date() };
  } catch (error) {
    logger.error('Failed to generate report', {
      jobId: job.id,
      reportType,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

// Tâches de nettoyage
cleanupQueue.process('cleanup-sessions', async (job) => {
  logger.info('Processing session cleanup job', { jobId: job.id });

  try {
    // TODO: Implémenter le nettoyage des sessions expirées
    // await sessionService.cleanupExpired();
    
    // Simulation pour le moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    logger.info('Session cleanup completed', { jobId: job.id });

    return { success: true, cleanedAt: new Date() };
  } catch (error) {
    logger.error('Failed to cleanup sessions', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

cleanupQueue.process('cleanup-logs', async (job) => {
  const { olderThanDays = 30 } = job.data;
  
  logger.info('Processing log cleanup job', {
    jobId: job.id,
    olderThanDays,
  });

  try {
    // TODO: Implémenter le nettoyage des logs anciens
    // await logService.cleanupOlderThan(olderThanDays);
    
    // Simulation pour le moment
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    logger.info('Log cleanup completed', {
      jobId: job.id,
      olderThanDays,
    });

    return { success: true, cleanedAt: new Date() };
  } catch (error) {
    logger.error('Failed to cleanup logs', {
      jobId: job.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
});

// ========================================
// GESTION DES ÉVÉNEMENTS
// ========================================

// Événements globaux pour toutes les queues
const queues = [emailQueue, notificationQueue, reportQueue, cleanupQueue];

queues.forEach(queue => {
  queue.on('completed', (job, result) => {
    logger.info(`Job completed: ${queue.name}`, {
      jobId: job.id,
      result,
      duration: Date.now() - job.timestamp,
    });
  });

  queue.on('failed', (job, err) => {
    logger.error(`Job failed: ${queue.name}`, {
      jobId: job.id,
      error: err.message,
      attempts: job.attemptsMade,
      maxAttempts: job.opts.attempts,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job stalled: ${queue.name}`, {
      jobId: job.id,
    });
  });
});

// ========================================
// TÂCHES RÉCURRENTES
// ========================================

// Nettoyage des sessions toutes les heures
cleanupQueue.add('cleanup-sessions', {}, {
  repeat: { cron: '0 * * * *' }, // Toutes les heures
  removeOnComplete: 5,
  removeOnFail: 3,
});

// Nettoyage des logs tous les jours à 2h du matin
cleanupQueue.add('cleanup-logs', { olderThanDays: 30 }, {
  repeat: { cron: '0 2 * * *' }, // Tous les jours à 2h
  removeOnComplete: 5,
  removeOnFail: 3,
});

// ========================================
// DÉMARRAGE DU WORKER
// ========================================

async function startWorker() {
  try {
    logger.info('🚀 Starting worker...');

    // Connexion à la base de données
    await connectDatabase();
    logger.info('✅ Database connected');

    // Connexion à Redis
    await connectRedis();
    logger.info('✅ Redis connected');

    logger.info('✅ Worker started successfully');
    logger.info('📊 Queues configured:', {
      email: emailQueue.name,
      notification: notificationQueue.name,
      report: reportQueue.name,
      cleanup: cleanupQueue.name,
    });

    // Afficher les statistiques des queues toutes les 30 secondes
    setInterval(async () => {
      for (const queue of queues) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();

        logger.info(`Queue stats: ${queue.name}`, {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        });
      }
    }, 30000);

  } catch (error) {
    logger.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// ========================================
// GESTION DE L'ARRÊT PROPRE
// ========================================

async function gracefulShutdown() {
  logger.info('🛑 Shutting down worker gracefully...');

  try {
    // Fermer toutes les queues
    await Promise.all(queues.map(queue => queue.close()));
    logger.info('✅ All queues closed');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Gestion des signaux d'arrêt
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// ========================================
// EXPORT DES QUEUES POUR UTILISATION EXTERNE
// ========================================

export {
  emailQueue,
  notificationQueue,
  reportQueue,
  cleanupQueue,
};

// Démarrer le worker si ce fichier est exécuté directement
if (require.main === module) {
  startWorker();
}
