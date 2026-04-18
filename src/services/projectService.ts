import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { Project, Template } from '../types';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'projects';

export const projectService = {
  // Local Storage Fallback
  getLocalProjects(): Project[] {
    const saved = localStorage.getItem('cadam_projects_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to load local projects", e);
      }
    }
    return [];
  },

  saveLocalProjects(projects: Project[]) {
    localStorage.setItem('cadam_projects_v1', JSON.stringify(projects));
  },

  // Firebase Operations
  async saveProjectToFirebase(project: Project, userId: string) {
    const projectRef = doc(db, COLLECTION_NAME, project.id);
    await setDoc(projectRef, {
      ...project,
      userId,
      lastUpdated: Date.now()
    }, { merge: true });
  },

  async deleteProjectFromFirebase(projectId: string) {
    const projectRef = doc(db, COLLECTION_NAME, projectId);
    await deleteDoc(projectRef);
  },

  subscribeToProjects(userId: string, callback: (projects: Project[]) => void) {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('lastUpdated', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const projects = snapshot.docs.map(doc => doc.data() as Project);
      callback(projects);
    });
  },

  // Templates Management
  async saveAsTemplate(template: Omit<Template, 'id' | 'createdAt'>) {
    const templateId = uuidv4();
    const templateRef = doc(db, 'templates', templateId);
    const data = {
      ...template,
      id: templateId,
      createdAt: Date.now()
    };
    await setDoc(templateRef, data);
    return templateId;
  },

  async getPublicTemplates(): Promise<Template[]> {
    const q = query(
      collection(db, 'templates'),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Template);
  },

  async deleteTemplate(templateId: string) {
    const templateRef = doc(db, 'templates', templateId);
    await deleteDoc(templateRef);
  },

  async updateTemplate(templateId: string, updates: Partial<Template>) {
    const templateRef = doc(db, 'templates', templateId);
    await setDoc(templateRef, updates, { merge: true });
  }
};
