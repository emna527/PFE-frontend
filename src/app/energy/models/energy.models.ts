export interface SfmResponseDTO {
  status: string;
  timestamp: string;
  reportId: string;
  siteInfo: SiteInfoDTO;
  period: PeriodDTO;
  globalConsumption: GlobalConsumptionDTO;
  equipmentConsumptions: EquipmentConsumptionDTO[];
  trendsComparison: TrendsDTO;
  alertsAndAnomalies: AlertDTO[];
}

export interface SiteInfoDTO {
  siteId: number;
  siteName: string;
  address: string;
  type: string;
  surface: number;
  totalDevices: number;
  nbrEmployees: number;
}

export interface PeriodDTO {
  startDate: string;
  endDate: string;
  durationDays: number;
}

export interface GlobalConsumptionDTO {
  totalKwh: number;
  totalCostEur: number;
  costPerKwh: number;
  carbonFootprintKgCo2: number;
  avgDailyKwh: number;
}


export interface EquipmentConsumptionDTO {
  equipmentName: string;
  designation: string;
  serialNumber: string;
  consumptionKwh: number;
  percentage: number;
  costEur: number;
  status: string;
}

export interface TrendsDTO {
  vsLastMonth: ChangeDTO;
  vsLastYear: ChangeDTO;
}

export interface ChangeDTO {
  consumptionChange: string;
  costChange: string;
}

export interface AlertDTO {
  type: string;
  severity: string;
  date: string;
  equipment: string;
  description: string;
  recommendation: string;
}

export interface EnergyReportHistory {
  id: number;
  siteName: string;
  startDate: number;
  endDate: number;
  totalKwh: number;
  totalCostEur: number;
  carbonFootprintKgCo2: number;
  avgDailyKwh: number;
  durationDays: number;
  fetchedAt: string;
  status: string;
}
