import Router from 'express';
import AppController from '../controllers/AppController';
import UsersController from '../controllers/UsersController';
import AuthController from '../controllers/AuthController';
import FilesController from '../controllers/FilesController';

const router = Router();

// System status and stats
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Authentication and Authorization
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);

// Upload new files
router.post('/files', FilesController.postUpload);

// Show files
router.get('/files/:id', FilesController.getShow);
router.get('/files', FilesController.getIndex);

// File Publish and Unpublish
router.put('/files/:id/publish', FilesController.putPublish);
router.put('/files/:id/unpublish', FilesController.putUnpublish);

// Return content of the file document based on ID
router.get('/files/:id/data', FilesController.getFile);

// Post create new user
router.post('/users', UsersController.postNew);

export default router;
