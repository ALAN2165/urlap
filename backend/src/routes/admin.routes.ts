import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { getOverview, getHealth } from '../controllers/admin.controller';
import { adminGetAnalytics } from '../controllers/adminAnalytics.controller';
import { adminGetLabs, adminCreateLab, adminUpdateLab, adminGetChallenge, adminCreateChallenge, adminUpdateChallenge, adminDeleteChallenge, adminReorderChallenges } from '../controllers/adminChallenges.controller';
import { adminTestSql } from '../controllers/adminSql.controller';
import { adminGetUsers, adminSetUserRole, adminSetUserBan, adminGetUserSubmissions } from '../controllers/adminUsers.controller';
import { adminGetAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement } from '../controllers/adminAnnouncements.controller';
import { adminGetReports, adminDeleteReport, adminReplyToReport } from '../controllers/adminReports.controller';
import { adminGetAlerts, adminAcknowledgeAlert, adminResolveAlert, adminTriggerTestAlert } from '../controllers/alert.controller';
import { adminGetConversationMessages, adminPostMessage, adminCloseConversation, adminGetOpenConversations, adminMessageUser } from '../controllers/chat.controller';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/overview', getOverview);
router.get('/health', getHealth);
router.get('/analytics', adminGetAnalytics);

router.get('/labs', adminGetLabs);
router.post('/labs', adminCreateLab);
router.put('/labs/:id', adminUpdateLab);
router.put('/labs/:labId/reorder', adminReorderChallenges);

router.get('/challenges/:id', adminGetChallenge);
router.post('/challenges', adminCreateChallenge);
router.put('/challenges/:id', adminUpdateChallenge);
router.delete('/challenges/:id', adminDeleteChallenge);

router.post('/sql-test', adminTestSql);

router.get('/users', adminGetUsers);
router.put('/users/:id/role', adminSetUserRole);
router.put('/users/:id/ban', adminSetUserBan);
router.get('/users/:id/submissions', adminGetUserSubmissions);
router.post('/users/:id/message', adminMessageUser);

router.get('/announcements', adminGetAnnouncements);
router.post('/announcements', adminCreateAnnouncement);
router.put('/announcements/:id', adminUpdateAnnouncement);
router.delete('/announcements/:id', adminDeleteAnnouncement);

router.get('/reports', adminGetReports);
router.delete('/reports/:id', adminDeleteReport);
router.post('/reports/:id/reply', adminReplyToReport);

router.get('/alerts', adminGetAlerts);
router.put('/alerts/:id/acknowledge', adminAcknowledgeAlert);
router.put('/alerts/:id/resolve', adminResolveAlert);
router.post('/alerts/test', adminTriggerTestAlert);

router.get('/conversations', adminGetOpenConversations);
router.get('/conversations/:id/messages', adminGetConversationMessages);
router.post('/conversations/:id/messages', adminPostMessage);
router.put('/conversations/:id/close', adminCloseConversation);

export default router;