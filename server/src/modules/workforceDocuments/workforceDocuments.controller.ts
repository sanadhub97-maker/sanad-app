import { Request, Response, NextFunction } from "express";
import { EmployeeDocumentType } from "@prisma/client";
import * as service from "@/modules/workforceDocuments/workforceDocuments.service";

export async function getIqamas(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listIqamas(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPassports(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listPassports(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHealthCertificates(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listGeneralDocuments(
      [EmployeeDocumentType.HEALTH_CERTIFICATE],
      req.query as any
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMedicalInsurance(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listGeneralDocuments(
      [EmployeeDocumentType.MEDICAL_INSURANCE],
      req.query as any
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getVisas(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listGeneralDocuments(
      [
        EmployeeDocumentType.VISA,
        EmployeeDocumentType.EXIT_REENTRY_VISA,
        EmployeeDocumentType.FINAL_EXIT_VISA,
      ],
      req.query as any
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getFlightTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listGeneralDocuments(
      [EmployeeDocumentType.FLIGHT_TICKET],
      req.query as any
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOverviewStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await service.getWorkforceOverviewStats();
    res.json({ data: stats });
  } catch (err) {
    next(err);
  }
}

export async function listAllDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listAllWorkforceDocuments(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCategoryCounts(_req: Request, res: Response, next: NextFunction) {
  try {
    const counts = await service.getWorkforceCategoryCounts();
    res.json({ data: counts });
  } catch (err) {
    next(err);
  }
}

export async function createDoc(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await service.createDocument(req.body);
    res.status(201).json({ data: doc, message: "تم إضافة الوثيقة بنجاح" });
  } catch (err) {
    next(err);
  }
}

export async function updateDoc(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await service.updateDocument(req.params.id, req.body);
    res.json({ data: doc, message: "تم تحديث بيانات الوثيقة بنجاح" });
  } catch (err) {
    next(err);
  }
}

export async function removeDoc(req: Request, res: Response, next: NextFunction) {
  try {
    await service.removeDocument(req.params.id);
    res.json({ message: "تم حذف الوثيقة بنجاح" });
  } catch (err) {
    next(err);
  }
}


