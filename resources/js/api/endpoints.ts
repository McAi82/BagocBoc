// services/api/endpoints.ts
import { api } from "./apiClient";
import { API_CONFIG } from "./config";

// ============================================
// RESIDENT ENDPOINTS
// ============================================

export const residentApi = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.residents.getAll);
      return response;
    } catch (error) {
      console.error("Error fetching residents:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.residents.getById(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching resident:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.residents.create,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating resident:", error);
      throw error;
    }
  },
  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.residents.update(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating resident:", error);
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      const response = await api.delete(
        API_CONFIG.endpoints.residents.delete(id),
      );
      return response;
    } catch (error) {
      console.error("Error deleting resident:", error);
      throw error;
    }
  },
  getByEncoder: async (userId: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.residents.getByEncoder(userId),
      );
      return response;
    } catch (error) {
      console.error("Error fetching residents by encoder:", error);
      return { data: { data: [] } };
    }
  },
};

// ============================================
// HOUSEHOLD ENDPOINTS
// ============================================

export const householdApi = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.households.info);
      return response;
    } catch (error) {
      console.error("Error fetching households:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.households.infoById(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching household:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(API_CONFIG.endpoints.census.create, data);
      return response;
    } catch (error) {
      console.error("Error creating household:", error);
      throw error;
    }
  },
  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.households.update(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating household:", error);
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      const response = await api.delete(
        API_CONFIG.endpoints.households.delete(id),
      );
      return response;
    } catch (error) {
      console.error("Error deleting household:", error);
      throw error;
    }
  },
  getByEncoder: async (userId: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.households.infoByEncoder(userId),
      );
      return response;
    } catch (error) {
      console.error("Error fetching households by encoder:", error);
      return { data: { data: [] } };
    }
  },
};

// ============================================
// GEO DATA ENDPOINTS
// ============================================

export const geoApi = {
  getHouses: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.geo.houses);
      return response;
    } catch (error) {
      console.error("Error fetching houses:", error);
      return { data: { data: [] } };
    }
  },
  getByHousehold: async (householdId: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.geo.byHousehold(householdId),
      );
      return response;
    } catch (error) {
      console.error("Error fetching house by household:", error);
      return null;
    }
  },
  getByZone: async (zoneId: number) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.geo.byZone(zoneId));
      return response;
    } catch (error) {
      console.error("Error fetching houses by zone:", error);
      return { data: { data: [] } };
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(API_CONFIG.endpoints.geo.houses, data);
      return response;
    } catch (error) {
      console.error("Error creating geotag:", error);
      throw error;
    }
  },
  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(`/web/geo/houses/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating geotag:", error);
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      const response = await api.delete(`/web/geo/houses/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting geotag:", error);
      throw error;
    }
  },
};

// ============================================
// CERTIFICATION ENDPOINTS
// ============================================

export const certificationApi = {
  getAll: async () => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.certifications.getAll,
      );
      return response;
    } catch (error) {
      console.error("Error fetching certifications:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.certifications.getById(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching certification:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.certifications.create,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating certification:", error);
      throw error;
    }
  },
  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.certifications.update(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating certification:", error);
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      const response = await api.delete(
        API_CONFIG.endpoints.certifications.delete(id),
      );
      return response;
    } catch (error) {
      console.error("Error deleting certification:", error);
      throw error;
    }
  },
  getTypes: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.certifications.types);
      return response;
    } catch (error) {
      console.error("Error fetching certification types:", error);
      return { data: { data: [] } };
    }
  },
  getAllTypes: async () => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.certifications.typesAll,
      );
      return response;
    } catch (error) {
      console.error("Error fetching all certification types:", error);
      return { data: { data: [] } };
    }
  },
  createType: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.certifications.storeType,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating certification type:", error);
      throw error;
    }
  },
  updateType: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.certifications.updateType(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating certification type:", error);
      throw error;
    }
  },
  deleteType: async (id: number) => {
    try {
      const response = await api.delete(
        API_CONFIG.endpoints.certifications.deleteType(id),
      );
      return response;
    } catch (error) {
      console.error("Error deleting certification type:", error);
      throw error;
    }
  },
  process: async (id: number) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.certifications.process(id),
      );
      return response;
    } catch (error) {
      console.error("Error processing certification:", error);
      throw error;
    }
  },
  release: async (id: number) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.certifications.release(id),
      );
      return response;
    } catch (error) {
      console.error("Error releasing certification:", error);
      throw error;
    }
  },
  reject: async ({ id, data }: { id: number; data: any }) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.certifications.reject(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error rejecting certification:", error);
      throw error;
    }
  },
};

// ============================================
// CLEARANCE ENDPOINTS
// ============================================

export const clearanceApi = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.clearance.getAll);
      return response;
    } catch (error) {
      console.error("Error fetching clearances:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.clearance.getById(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching clearance:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.clearance.create,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating clearance:", error);
      throw error;
    }
  },
  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.clearance.update(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating clearance:", error);
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      const response = await api.delete(
        API_CONFIG.endpoints.clearance.delete(id),
      );
      return response;
    } catch (error) {
      console.error("Error deleting clearance:", error);
      throw error;
    }
  },
  release: async (id: number) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.clearance.release(id),
      );
      return response;
    } catch (error) {
      console.error("Error releasing clearance:", error);
      throw error;
    }
  },
  reject: async ({ id, data }: { id: number; data: any }) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.clearance.reject(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error rejecting clearance:", error);
      throw error;
    }
  },
  getConfiguration: async () => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.clearance.configuration,
      );
      return response;
    } catch (error) {
      console.error("Error fetching clearance configuration:", error);
      return null;
    }
  },
  updateConfiguration: async (data: any) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.clearance.configuration,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating clearance configuration:", error);
      throw error;
    }
  },
};

// ============================================
// PAYMENT ENDPOINTS
// ============================================

export const paymentApi = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.payments.getAll);
      return response;
    } catch (error) {
      console.error("Error fetching payments:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.payments.getById(id));
      return response;
    } catch (error) {
      console.error("Error fetching payment:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.payments.create,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  },
  getReceipt: async (id: number) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.payments.receipt(id));
      return response;
    } catch (error) {
      console.error("Error fetching receipt:", error);
      return null;
    }
  },
};

// ============================================
// TAX PAYMENT ENDPOINTS
// ============================================

export const taxApi = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.tax.getAll);
      return response;
    } catch (error) {
      console.error("Error fetching tax payments:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.tax.getById(id));
      return response;
    } catch (error) {
      console.error("Error fetching tax payment:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(API_CONFIG.endpoints.tax.create, data);
      return response;
    } catch (error) {
      console.error("Error creating tax payment:", error);
      throw error;
    }
  },
  getReceipt: async (id: number) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.tax.receipt(id));
      return response;
    } catch (error) {
      console.error("Error fetching tax receipt:", error);
      return null;
    }
  },
};

// ============================================
// ANNOUNCEMENT ENDPOINTS
// ============================================

export const announcementApi = {
  getAll: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.announcements.getAll);
      return response;
    } catch (error) {
      console.error("Error fetching announcements:", error);
      return { data: { data: [] } };
    }
  },
  getById: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.announcements.getById(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching announcement:", error);
      return null;
    }
  },
  create: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.announcements.create,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating announcement:", error);
      throw error;
    }
  },
  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(
        API_CONFIG.endpoints.announcements.update(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating announcement:", error);
      throw error;
    }
  },
  delete: async (id: number) => {
    try {
      const response = await api.delete(
        API_CONFIG.endpoints.announcements.delete(id),
      );
      return response;
    } catch (error) {
      console.error("Error deleting announcement:", error);
      throw error;
    }
  },
  getPublic: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.announcements.public);
      return response;
    } catch (error) {
      console.error("Error fetching public announcements:", error);
      return { data: { data: [] } };
    }
  },
};

// ============================================
// FRONT DESK ENDPOINTS
// ============================================

export const frontDeskApi = {
  // Requests
  getRequests: async (params?: any) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.frontdesk.requests, {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error fetching requests:", error);
      return { data: { data: [] } };
    }
  },
  getRequestById: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.frontdesk.requestById(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching request:", error);
      return null;
    }
  },
  createRequest: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.requests,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating request:", error);
      throw error;
    }
  },
  processRequest: async (id: number) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.process(id),
      );
      return response;
    } catch (error) {
      console.error("Error processing request:", error);
      throw error;
    }
  },
  issueDocument: async (id: number) => {
    try {
      const response = await api.post(API_CONFIG.endpoints.frontdesk.issue(id));
      return response;
    } catch (error) {
      console.error("Error issuing document:", error);
      throw error;
    }
  },
  forwardRequest: async ({ id, data }: { id: number; data: any }) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.forward(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error forwarding request:", error);
      throw error;
    }
  },
  cancelRequest: async (id: number) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.cancel(id),
      );
      return response;
    } catch (error) {
      console.error("Error cancelling request:", error);
      throw error;
    }
  },
  // Queue
  getQueue: async (params?: any) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.frontdesk.queue, {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error fetching queue:", error);
      return { data: { data: [] } };
    }
  },
  addToQueue: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.queue,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error adding to queue:", error);
      throw error;
    }
  },
  callNext: async () => {
    try {
      const response = await api.post(API_CONFIG.endpoints.frontdesk.callNext);
      return response;
    } catch (error) {
      console.error("Error calling next:", error);
      throw error;
    }
  },
  removeFromQueue: async (id: number) => {
    try {
      const response = await api.delete(`/web/frontdesk/queue/${id}`);
      return response;
    } catch (error) {
      console.error("Error removing from queue:", error);
      throw error;
    }
  },
  // Appointments
  getAppointments: async (params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.frontdesk.appointments,
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching appointments:", error);
      return { data: { data: [] } };
    }
  },
  createAppointment: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.appointments,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating appointment:", error);
      throw error;
    }
  },
  updateAppointment: async ({ id, data }: { id: number; data: any }) => {
    try {
      const response = await api.put(`/web/frontdesk/appointments/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating appointment:", error);
      throw error;
    }
  },
  cancelAppointment: async (id: number) => {
    try {
      const response = await api.post(
        `/web/frontdesk/appointments/${id}/cancel`,
      );
      return response;
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      throw error;
    }
  },
  // Claim Slips
  getClaimSlips: async (params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.frontdesk.claimSlips,
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching claim slips:", error);
      return { data: { data: [] } };
    }
  },
  generateClaimSlip: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.claimSlips,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error generating claim slip:", error);
      throw error;
    }
  },
  printClaimSlip: async (id: number) => {
    try {
      const response = await api.get(`/web/frontdesk/claim-slips/${id}/print`);
      return response;
    } catch (error) {
      console.error("Error printing claim slip:", error);
      return null;
    }
  },
  markClaimed: async (id: number) => {
    try {
      const response = await api.post(`/web/frontdesk/claim-slips/${id}/claim`);
      return response;
    } catch (error) {
      console.error("Error marking claim:", error);
      throw error;
    }
  },
  // Front Desk Residents
  getResidents: async (params?: any) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.frontdesk.residents, {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error fetching residents:", error);
      return { data: { data: [] } };
    }
  },
  registerResident: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.frontdesk.residents,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error registering resident:", error);
      throw error;
    }
  },
  getFrontDeskResident: async (id: number) => {
    try {
      const response = await api.get(`/web/frontdesk/residents/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching resident:", error);
      return null;
    }
  },
  verifyResident: async (id: number) => {
    try {
      const response = await api.get(`/web/frontdesk/residents/${id}/verify`);
      return response;
    } catch (error) {
      console.error("Error verifying resident:", error);
      return null;
    }
  },
};

// ============================================
// BARANGAY INFO ENDPOINTS
// ============================================

export const barangayApi = {
  getInfo: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.barangay.info);
      return response;
    } catch (error) {
      console.error("Error fetching barangay info:", error);
      return null;
    }
  },
  updateInfo: async (data: any) => {
    try {
      const response = await api.put(API_CONFIG.endpoints.barangay.info, data);
      return response;
    } catch (error) {
      console.error("Error updating barangay info:", error);
      throw error;
    }
  },
  getZones: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.barangay.zones);
      return response;
    } catch (error) {
      console.error("Error fetching barangay zones:", error);
      return { data: { data: [] } };
    }
  },
  getZoneById: async (id: number) => {
    try {
      const response = await api.get(`/web/barangay-zones/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching zone:", error);
      return null;
    }
  },
  createZone: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.barangay.zones,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating zone:", error);
      throw error;
    }
  },
  updateZone: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(`/web/barangay-zones/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating zone:", error);
      throw error;
    }
  },
  deleteZone: async (id: number) => {
    try {
      const response = await api.delete(`/web/barangay-zones/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting zone:", error);
      throw error;
    }
  },
};

// ============================================
// FINANCIAL REPORT ENDPOINTS
// ============================================

export const financialReportApi = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/web/financial-reports", { params });
      return response;
    } catch (error) {
      console.error("Error fetching financial reports:", error);
      return { data: { data: [] } };
    }
  },

  getById: async (id: number) => {
    try {
      const response = await api.get(`/web/financial-reports/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching financial report:", error);
      return null;
    }
  },

  create: async (data: any) => {
    try {
      const response = await api.post("/web/financial-reports", data);
      return response;
    } catch (error) {
      console.error("Error creating financial report:", error);
      throw error;
    }
  },

  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(`/web/financial-reports/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating financial report:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      const response = await api.delete(`/web/financial-reports/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting financial report:", error);
      throw error;
    }
  },

  submit: async (id: number) => {
    try {
      const response = await api.post(`/web/financial-reports/${id}/submit`);
      return response;
    } catch (error) {
      console.error("Error submitting financial report:", error);
      throw error;
    }
  },

  approve: async (id: number) => {
    try {
      const response = await api.post(`/web/financial-reports/${id}/approve`);
      return response;
    } catch (error) {
      console.error("Error approving financial report:", error);
      throw error;
    }
  },

  reject: async ({ id, data }: { id: number; data: any }) => {
    try {
      const response = await api.post(
        `/web/financial-reports/${id}/reject`,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error rejecting financial report:", error);
      throw error;
    }
  },

  getPending: async () => {
    try {
      const response = await api.get("/web/financial-reports/pending");
      return response;
    } catch (error) {
      console.error("Error fetching pending reports:", error);
      return { data: { data: [] } };
    }
  },
};

// ============================================
// USER ENDPOINTS
// ============================================

export const userApi = {
  getAll: async () => {
    try {
      const response = await api.get("/web/users");
      return response;
    } catch (error) {
      console.error("Error fetching users:", error);
      return { data: { data: [] } };
    }
  },

  getById: async (id: number) => {
    try {
      const response = await api.get(`/web/users/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  },

  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(`/web/users/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      const response = await api.delete(`/web/users/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  },

  toggleStatus: async (id: number) => {
    try {
      const response = await api.post(`/web/users/${id}/toggle-status`);
      return response;
    } catch (error) {
      console.error("Error toggling user status:", error);
      throw error;
    }
  },
};

// ============================================
// ROLE ENDPOINTS
// ============================================

export const roleApi = {
  getAll: async () => {
    try {
      const response = await api.get("/web/roles");
      return response;
    } catch (error) {
      console.error("Error fetching roles:", error);
      return { data: { data: [] } };
    }
  },

  getById: async (id: number) => {
    try {
      const response = await api.get(`/web/roles/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching role:", error);
      return null;
    }
  },

  create: async (data: any) => {
    try {
      const response = await api.post("/web/roles", data);
      return response;
    } catch (error) {
      console.error("Error creating role:", error);
      throw error;
    }
  },

  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(`/web/roles/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating role:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      const response = await api.delete(`/web/roles/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting role:", error);
      throw error;
    }
  },
};

// ============================================
// NOTIFICATION ENDPOINTS
// ============================================

export const notificationApi = {
  getAll: async () => {
    try {
      const response = await api.get("/web/notifications");
      return response;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return { data: { data: [] } };
    }
  },

  getUnreadCount: async () => {
    try {
      const response = await api.get("/web/notifications/unread-count");
      return response;
    } catch (error) {
      console.error("Error fetching unread count:", error);
      return { data: { count: 0 } };
    }
  },

  markRead: async (notificationId: number) => {
    try {
      const response = await api.post("/web/notifications/mark-read", {
        notification_id: notificationId,
      });
      return response;
    } catch (error) {
      console.error("Error marking notification read:", error);
      throw error;
    }
  },

  markAllRead: async () => {
    try {
      const response = await api.post("/web/notifications/mark-all-read");
      return response;
    } catch (error) {
      console.error("Error marking all notifications read:", error);
      throw error;
    }
  },

  send: async (data: any) => {
    try {
      const response = await api.post("/web/notifications/send", data);
      return response;
    } catch (error) {
      console.error("Error sending notification:", error);
      throw error;
    }
  },
};

// ============================================
// PENALTY ENDPOINTS
// ============================================

export const penaltyApi = {
  getAll: async (params?: any) => {
    try {
      const response = await api.get("/web/penalties", { params });
      return response;
    } catch (error) {
      console.error("Error fetching penalties:", error);
      return { data: { data: [] } };
    }
  },

  getById: async (id: number) => {
    try {
      const response = await api.get(`/web/penalties/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching penalty:", error);
      return null;
    }
  },

  create: async (data: any) => {
    try {
      const response = await api.post("/web/penalties", data);
      return response;
    } catch (error) {
      console.error("Error creating penalty:", error);
      throw error;
    }
  },

  update: async ({ data, id }: { data: any; id: number }) => {
    try {
      const response = await api.put(`/web/penalties/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating penalty:", error);
      throw error;
    }
  },

  delete: async (id: number) => {
    try {
      const response = await api.delete(`/web/penalties/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting penalty:", error);
      throw error;
    }
  },
};

// ============================================
// ACCOUNT ACTIVATION ENDPOINTS
// ============================================

export const accountActivationApi = {
  verify: async (data: any) => {
    try {
      const response = await api.post("/account-activation/verify", data);
      return response;
    } catch (error) {
      console.error("Error verifying account:", error);
      throw error;
    }
  },

  request: async (data: any) => {
    try {
      const response = await api.post("/account-activation/request", data);
      return response;
    } catch (error) {
      console.error("Error requesting activation:", error);
      throw error;
    }
  },
};

// ============================================
// PRINT ENDPOINTS
// ============================================

export const printApi = {
  receipt: async (id: number) => {
    try {
      const response = await api.get(`/web/print/receipt/${id}`);
      return response;
    } catch (error) {
      console.error("Error printing receipt:", error);
      return null;
    }
  },

  certificate: async (id: number) => {
    try {
      const response = await api.get(`/web/print/certificate/${id}`);
      return response;
    } catch (error) {
      console.error("Error printing certificate:", error);
      return null;
    }
  },

  taxReceipt: async (id: number) => {
    try {
      const response = await api.get(`/web/print/tax-receipt/${id}`);
      return response;
    } catch (error) {
      console.error("Error printing tax receipt:", error);
      return null;
    }
  },

  clearance: async (id: number) => {
    try {
      const response = await api.get(`/web/print/clearance/${id}`);
      return response;
    } catch (error) {
      console.error("Error printing clearance:", error);
      return null;
    }
  },

  claimSlip: async (id: number) => {
    try {
      const response = await api.get(`/web/print/claim-slip/${id}`);
      return response;
    } catch (error) {
      console.error("Error printing claim slip:", error);
      return null;
    }
  },
};

// ============================================
// GEO DATA QUERY HELPER (Combined)
// ============================================

export const geoDataQueries = {
  getCompleteGeoData: async () => {
    try {
      const [housesResponse, householdsResponse, residentsResponse] =
        await Promise.all([
          geoApi.getHouses(),
          householdApi.getAll(),
          residentApi.getAll(),
        ]);

      // Extract data safely
      const houses = housesResponse?.data?.data || housesResponse?.data || [];
      const households =
        householdsResponse?.data?.data || householdsResponse?.data || [];
      const residents =
        residentsResponse?.data?.data || residentsResponse?.data || [];

      console.log("Geo data sources:", {
        houses: houses.length,
        households: households.length,
        residents: residents.length,
      });

      // Create maps for lookups
      const householdMap = new Map();
      for (let i = 0; i < households.length; i++) {
        householdMap.set(households[i].id, households[i]);
      }

      const residentMap = new Map();
      for (let i = 0; i < residents.length; i++) {
        const resident = residents[i];
        const householdId = resident.household_id || resident.householdId;
        if (!residentMap.has(householdId)) {
          residentMap.set(householdId, []);
        }
        residentMap.get(householdId).push(resident);
      }

      // Combine data
      const combinedData = [];
      for (let i = 0; i < houses.length; i++) {
        const house = houses[i];
        const householdId = house.household_id || house.householdId;
        combinedData.push({
          ...house,
          latitude: house.latitude || house.geotag?.latitude || 0,
          longitude: house.longitude || house.geotag?.longitude || 0,
          household: householdMap.get(householdId) || null,
          residents: residentMap.get(householdId) || [],
          address: householdMap.get(householdId)?.address || null,
          geotag: house,
          household_number:
            householdMap.get(householdId)?.household_number || "N/A",
          household_tracking_number:
            householdMap.get(householdId)?.household_tracking_number || "N/A",
        });
      }

      return combinedData;
    } catch (error) {
      console.error("Error in getCompleteGeoData:", error);
      return [];
    }
  },
};

export const healthApi = {
  // ============================================
  // STATS
  // ============================================

  /**
   * Get health dashboard statistics
   */
  getStats: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.health.stats);
      return response;
    } catch (error) {
      console.error("Error fetching health stats:", error);
      return {
        data: {
          data: {
            totalPatients: 0,
            pregnant: 0,
            children: 0,
            lactating: 0,
            senior: 0,
            ncd: 0,
            todayCheckups: 0,
            pendingFollowups: 0,
          },
        },
      };
    }
  },

  /**
   * Get zone statistics for health
   */
  getZoneStats: async () => {
    try {
      const response = await api.get(API_CONFIG.endpoints.health.zoneStats);
      return response;
    } catch (error) {
      console.error("Error fetching zone stats:", error);
      return { data: { data: [] } };
    }
  },

  // ============================================
  // PATH A: Create New Patient Record
  // ============================================

  /**
   * Search for existing resident records (dedupe check)
   */
  searchResident: async (searchTerm: string) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.searchResident,
        {
          search: searchTerm,
        },
      );
      return response;
    } catch (error) {
      console.error("Error searching resident:", error);
      throw error;
    }
  },

  /**
   * Create new patient record (only if no existing record found)
   */
  createPatient: async (data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.createPatient,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating patient record:", error);
      throw error;
    }
  },

  // ============================================
  // PATH B: Pregnant Records
  // ============================================

  /**
   * Get all pregnant records with pagination
   */
  getPregnantRecords: async (params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.pregnantRecords,
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching pregnant records:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get pregnancy details by ID
   */
  getPregnancyDetails: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.pregnancyDetails(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching pregnancy details:", error);
      return null;
    }
  },

  storePregnancyCheckup: async (id: number, data: any) => {
    const response = await api.post(
      API_CONFIG.endpoints.health.pregnancyCheckup(id),
      data,
    );
    return response;
  },

  // ============================================
  // PATH B: Children Records
  // ============================================

  /**
   * Get all children records with pagination
   */
  getChildrenRecords: async (params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.childrenRecords,
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching children records:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get child details by ID
   */
  getChildDetails: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.childDetails(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching child details:", error);
      return null;
    }
  },

  /**
   * Store child checkup/vaccination
   */
  storeChildCheckup: async (id: number, data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.childCheckup(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error saving child checkup:", error);
      throw error;
    }
  },

  // ============================================
  // PATH B: Lactating Records
  // ============================================

  /**
   * Get all lactating records with pagination
   */
  getLactatingRecords: async (params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.lactatingRecords,
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching lactating records:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get lactating details by ID
   */
  getLactatingDetails: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.lactatingDetails(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching lactating details:", error);
      return null;
    }
  },

  /**
   * Store lactating checkup/counseling
   */
  storeLactatingCheckup: async (id: number, data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.lactatingCheckup(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error saving lactating checkup:", error);
      throw error;
    }
  },

  // ============================================
  // PATH B: Senior Records
  // ============================================

  /**
   * Get all senior records with pagination
   */
  getSeniorRecords: async (params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.seniorRecords,
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching senior records:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get senior details by ID
   */
  getSeniorDetails: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.seniorDetails(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching senior details:", error);
      return null;
    }
  },

  /**
   * Store senior health review
   */
  storeSeniorCheckup: async (id: number, data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.seniorCheckup(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error saving senior checkup:", error);
      throw error;
    }
  },

  // ============================================
  // PATH B: Other/NCD Records
  // ============================================

  /**
   * Get all NCD records with pagination
   */
  getOtherRecords: async (params?: any) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.health.otherRecords, {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error fetching NCD records:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get NCD details by ID
   */
  getOtherDetails: async (id: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.otherDetails(id),
      );
      return response;
    } catch (error) {
      console.error("Error fetching NCD details:", error);
      return null;
    }
  },

  /**
   * Store NCD monitoring checkup
   */
  storeOtherCheckup: async (id: number, data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.otherCheckup(id),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error saving NCD checkup:", error);
      throw error;
    }
  },

  // ============================================
  // SHARED: Notify BHW
  // ============================================

  /**
   * Notify BHW about a checkup
   */
  notifyBHW: async (id: number) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.notifyBHW(id),
      );
      return response;
    } catch (error) {
      console.error("Error notifying BHW:", error);
      throw error;
    }
  },

  // ============================================
  // PATIENT RECORDS (Legacy/Compatibility)
  // ============================================

  /**
   * Get all patients with filters
   */
  getPatients: async (params?: any) => {
    try {
      const response = await api.get(API_CONFIG.endpoints.health.patients, {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error fetching patients:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get patient by ID
   */
  getPatientById: async (id: number) => {
    try {
      // Try to get from all category endpoints
      const categories = [
        healthApi.getPregnancyDetails,
        healthApi.getChildDetails,
        healthApi.getLactatingDetails,
        healthApi.getSeniorDetails,
        healthApi.getOtherDetails,
      ];

      for (const endpoint of categories) {
        try {
          const response = await endpoint(id);
          if (response?.data?.data) {
            return response;
          }
        } catch (e) {
          // Continue to next category
          continue;
        }
      }

      // If no record found in any category
      return null;
    } catch (error) {
      console.error("Error fetching patient:", error);
      return null;
    }
  },

  /**
   * Get patient by resident ID
   */
  getPatientByResident: async (residentId: number) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.patientByResident(residentId),
      );
      return response;
    } catch (error) {
      console.error("Error fetching patient by resident:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get checkups by patient record ID
   */
  getCheckups: async (patientRecordId: number, params?: any) => {
    try {
      const response = await api.get(
        API_CONFIG.endpoints.health.checkups(patientRecordId),
        { params },
      );
      return response;
    } catch (error) {
      console.error("Error fetching checkups:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Create checkup for a patient
   */
  createCheckup: async (patientRecordId: number, data: any) => {
    try {
      const response = await api.post(
        API_CONFIG.endpoints.health.createCheckup(patientRecordId),
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating checkup:", error);
      throw error;
    }
  },

  // ============================================
  // MATERNAL PROFILES (BNS)
  // ============================================

  /**
   * Get all maternal profiles
   */
  getMaternalProfiles: async (params?: any) => {
    try {
      const response = await api.get("/web/health/maternal", { params });
      return response;
    } catch (error) {
      console.error("Error fetching maternal profiles:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get maternal profile by ID
   */
  getMaternalProfile: async (id: number) => {
    try {
      const response = await api.get(`/web/health/maternal/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching maternal profile:", error);
      return null;
    }
  },

  /**
   * Create maternal profile
   */
  createMaternalProfile: async (data: any) => {
    try {
      const response = await api.post("/web/health/maternal", data);
      return response;
    } catch (error) {
      console.error("Error creating maternal profile:", error);
      throw error;
    }
  },

  /**
   * Update maternal profile
   */
  updateMaternalProfile: async (id: number, data: any) => {
    try {
      const response = await api.put(`/web/health/maternal/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating maternal profile:", error);
      throw error;
    }
  },

  /**
   * Delete maternal profile
   */
  deleteMaternalProfile: async (id: number) => {
    try {
      const response = await api.delete(`/web/health/maternal/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting maternal profile:", error);
      throw error;
    }
  },

  // ============================================
  // NUTRITION ASSESSMENTS (BNS)
  // ============================================

  /**
   * Get all nutrition assessments
   */
  getNutritionAssessments: async (params?: any) => {
    try {
      const response = await api.get("/web/health/nutrition/assessments", {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error fetching nutrition assessments:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get nutrition assessment by ID
   */
  getNutritionAssessment: async (id: number) => {
    try {
      const response = await api.get(`/web/health/nutrition/assessments/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching nutrition assessment:", error);
      return null;
    }
  },

  /**
   * Create nutrition assessment
   */
  createNutritionAssessment: async (data: any) => {
    try {
      const response = await api.post(
        "/web/health/nutrition/assessments",
        data,
      );
      return response;
    } catch (error) {
      console.error("Error creating nutrition assessment:", error);
      throw error;
    }
  },

  /**
   * Update nutrition assessment
   */
  updateNutritionAssessment: async (id: number, data: any) => {
    try {
      const response = await api.put(
        `/web/health/nutrition/assessments/${id}`,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error updating nutrition assessment:", error);
      throw error;
    }
  },

  /**
   * Delete nutrition assessment
   */
  deleteNutritionAssessment: async (id: number) => {
    try {
      const response = await api.delete(
        `/web/health/nutrition/assessments/${id}`,
      );
      return response;
    } catch (error) {
      console.error("Error deleting nutrition assessment:", error);
      throw error;
    }
  },

  // ============================================
  // PROGRAMS (BNS)
  // ============================================

  /**
   * Get all programs
   */
  getPrograms: async (params?: any) => {
    try {
      const response = await api.get("/web/health/programs", { params });
      return response;
    } catch (error) {
      console.error("Error fetching programs:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Get program by ID
   */
  getProgram: async (id: number) => {
    try {
      const response = await api.get(`/web/health/programs/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching program:", error);
      return null;
    }
  },

  /**
   * Create program
   */
  createProgram: async (data: any) => {
    try {
      const response = await api.post("/web/health/programs", data);
      return response;
    } catch (error) {
      console.error("Error creating program:", error);
      throw error;
    }
  },

  /**
   * Update program
   */
  updateProgram: async (id: number, data: any) => {
    try {
      const response = await api.put(`/web/health/programs/${id}`, data);
      return response;
    } catch (error) {
      console.error("Error updating program:", error);
      throw error;
    }
  },

  /**
   * Delete program
   */
  deleteProgram: async (id: number) => {
    try {
      const response = await api.delete(`/web/health/programs/${id}`);
      return response;
    } catch (error) {
      console.error("Error deleting program:", error);
      throw error;
    }
  },

  /**
   * Get program participants
   */
  getProgramParticipants: async (programId: number) => {
    try {
      const response = await api.get(
        `/web/health/programs/${programId}/participants`,
      );
      return response;
    } catch (error) {
      console.error("Error fetching program participants:", error);
      return { data: { data: [] } };
    }
  },

  /**
   * Add participant to program
   */
  addProgramParticipant: async (programId: number, data: any) => {
    try {
      const response = await api.post(
        `/web/health/programs/${programId}/participants`,
        data,
      );
      return response;
    } catch (error) {
      console.error("Error adding program participant:", error);
      throw error;
    }
  },

  /**
   * Remove participant from program
   */
  removeProgramParticipant: async (
    programId: number,
    participantId: number,
  ) => {
    try {
      const response = await api.delete(
        `/web/health/programs/${programId}/participants/${participantId}`,
      );
      return response;
    } catch (error) {
      console.error("Error removing program participant:", error);
      throw error;
    }
  },

  getAllCheckups: async (params?: any) => {
    try {
      // Use a dedicated endpoint for all checkups
      // If your backend doesn't have this endpoint yet, we'll use the patients checkups endpoint with a workaround
      const response = await api.get("/web/health/checkups", { params });
      return response;
    } catch (error) {
      console.error("Error fetching all checkups:", error);
      // Fallback: try to get from patients endpoint
      try {
        // Get all patients and their checkups
        const patientsResponse = await api.get("/web/health/patients", {
          params: { per_page: 100 },
        });
        const patients = patientsResponse.data?.data?.data || [];
        let allCheckups: any[] = [];

        for (const patient of patients) {
          if (patient.checkups && patient.checkups.length > 0) {
            allCheckups = [
              ...allCheckups,
              ...patient.checkups.map((c: any) => ({
                ...c,
                resident: patient.resident,
                patient_record_id: patient.id,
              })),
            ];
          }
        }

        // Sort by date descending
        allCheckups.sort(
          (a, b) =>
            new Date(b.checkup_date).getTime() -
            new Date(a.checkup_date).getTime(),
        );

        return {
          data: {
            data: {
              data: allCheckups,
              total: allCheckups.length,
              current_page: 1,
              last_page: 1,
            },
          },
        };
      } catch (fallbackError) {
        console.error("Fallback error:", fallbackError);
        return { data: { data: { data: [], total: 0 } } };
      }
    }
  },
};

export const bnsApi = {
  // Dashboard
  getDashboardStats: async () => {
    try {
      const response = await api.get("/web/bns/dashboard/stats");
      return response;
    } catch (error) {
      console.error("Error fetching BNS dashboard stats:", error);
      return {
        data: {
          data: {
            total_records: 0,
            total_households: 0,
            total_zones: 0,
            total_demographics: 6,
            pending_records: 0,
            approved_records: 0,
          },
        },
      };
    }
  },

  // Records
  getRecords: async (params?: any) => {
    try {
      const response = await api.get("/web/bns/records", { params });
      return response;
    } catch (error) {
      console.error("Error fetching BNS records:", error);
      return { data: { data: [] } };
    }
  },

  getRecord: async (id: number) => {
    try {
      const response = await api.get(`/web/bns/records/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching BNS record:", error);
      return null;
    }
  },

  exportRecords: async (params?: any) => {
    try {
      const response = await api.get("/web/bns/records/export", {
        params,
        responseType: "blob",
      });
      return response;
    } catch (error) {
      console.error("Error exporting BNS records:", error);
      throw error;
    }
  },

  // Consolidation
  consolidateDemographic: async (type: string, params?: any) => {
    try {
      const response = await api.get(`/web/bns/consolidate/${type}`, {
        params,
      });
      return response;
    } catch (error) {
      console.error("Error consolidating demographic:", error);
      return null;
    }
  },

  // Reports
  generateReport: async (data: {
    demographic: string;
    generate_all: boolean;
  }) => {
    try {
      const response = await api.post("/web/bns/reports/generate", data);
      return response;
    } catch (error) {
      console.error("Error generating report:", error);
      throw error;
    }
  },

  getReport: async (id: string) => {
    try {
      const response = await api.get(`/web/bns/reports/${id}`);
      return response;
    } catch (error) {
      console.error("Error fetching report:", error);
      return null;
    }
  },

  downloadReport: async (id: string) => {
    try {
      const response = await api.get(`/web/bns/reports/${id}/download`, {
        responseType: "blob",
      });
      return response;
    } catch (error) {
      console.error("Error downloading report:", error);
      throw error;
    }
  },

  // GIS / Zone Statistics
  getAllZoneStatistics: async () => {
    try {
      const response = await api.get("/web/bns/zone-statistics");
      return response;
    } catch (error) {
      console.error("Error fetching zone statistics:", error);
      return { data: { data: [] } };
    }
  },

  getZoneStatistics: async (zoneId: number) => {
    try {
      const response = await api.get(`/web/bns/zone-statistics/${zoneId}`);
      return response;
    } catch (error) {
      console.error("Error fetching zone statistics:", error);
      return null;
    }
  },
};
// ============================================
// EXPORT ALL
// ============================================

export default {
  resident: residentApi,
  household: householdApi,
  geo: geoApi,
  certification: certificationApi,
  clearance: clearanceApi,
  payment: paymentApi,
  tax: taxApi,
  announcement: announcementApi,
  frontDesk: frontDeskApi,
  financialReport: financialReportApi,
  barangay: barangayApi,
  user: userApi,
  role: roleApi,
  notification: notificationApi,
  penalty: penaltyApi,
  accountActivation: accountActivationApi,
  print: printApi,
  geoDataQueries,
};
