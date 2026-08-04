import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/attendance/bulk - Bulk attendance operations
 * Body: { records: Array<{ employeeId, date, clockIn?, clockOut?, breakDuration?, status, notes? }> }
 * 
 * Allows manual entry/correction by admin for multiple employees at once
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { records } = body;

    // Validate input
    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, error: "La liste des enregistrements est obligatoire et doit être un tableau non vide" },
        { status: 400 }
      );
    }

    if (records.length > 100) {
      return NextResponse.json(
        { success: false, error: "Maximum 100 enregistrements par requête" },
        { status: 400 }
      );
    }

    const results: Array<{
      success: boolean;
      data?: any;
      error?: string;
      index: number;
    }> = [];
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Validate required fields for each record
        if (!record.employeeId || !record.date) {
          results.push({
            success: false,
            error: "employeeId et date sont obligatoires",
            index: i
          });
          errorCount++;
          continue;
        }

        // Check if employee exists
        const employee = await db.employee.findUnique({
          where: { id: record.employeeId }
        });

        if (!employee) {
          results.push({
            success: false,
            error: `Employé ${record.employeeId} non trouvé`,
            index: i
          });
          errorCount++;
          continue;
        }

        // Parse date (start of day)
        const recordDate = new Date(record.date);
        const dayStart = new Date(recordDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(recordDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Check for existing record
        const existingRecord = await db.attendance.findFirst({
          where: {
            employeeId: record.employeeId,
            date: { gte: dayStart, lte: dayEnd }
          }
        });

        // Prepare data
        const data: Record<string, any> = {
          status: record.status || 'present',
          notes: record.notes || null,
          breakDuration: parseInt(record.breakDuration) || 0
        };

        // Handle clock times and calculate worked hours
        if (record.clockIn) {
          data.clockIn = new Date(record.clockIn);
        }

        if (record.clockOut) {
          data.clockOut = new Date(record.clockOut);

          // Calculate worked hours if both clockIn and clockOut are present
          if (data.clockIn && data.clockOut) {
            const clockInTime = data.clockIn.getTime();
            const clockOutTime = data.clockOut.getTime();
            const totalMs = clockOutTime - clockInTime;
            const breakMs = (data.breakDuration || 0) * 60 * 1000;
            const workedMs = Math.max(0, totalMs - breakMs);
            data.workedHours = parseFloat((workedMs / (1000 * 60 * 60)).toFixed(2));
            
            // Calculate overtime (after 8 hours)
            data.overtimeHours = Math.max(0, parseFloat((data.workedHours - 8).toFixed(2)));
          }
        } else if (record.workedHours !== undefined) {
          data.workedHours = parseFloat(record.workedHours) || 0;
          data.overtimeHours = Math.max(0, parseFloat((data.workedHours - 8).toFixed(2)));
        }

        let savedRecord;

        if (existingRecord) {
          // Update existing record
          savedRecord = await db.attendance.update({
            where: { id: existingRecord.id },
            data,
            include: {
              employee: {
                select: {
                  id: true,
                  matricule: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          });
          updatedCount++;
          
          results.push({
            success: true,
            data: savedRecord,
            index: i
          });
        } else {
          // Create new record
          data.date = dayStart;
          data.employeeId = record.employeeId;
          
          savedRecord = await db.attendance.create({
            data,
            include: {
              employee: {
                select: {
                  id: true,
                  matricule: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          });
          createdCount++;
          
          results.push({
            success: true,
            data: savedRecord,
            index: i
          });
        }
      } catch (err) {
        console.error(`Bulk attendance error at index ${i}:`, err);
        results.push({
          success: false,
          error: `Erreur lors du traitement de l'enregistrement ${i + 1}`,
          index: i
        });
        errorCount++;
      }
    }

    return NextResponse.json({
      success: errorCount === 0,
      data: results,
      summary: {
        total: records.length,
        created: createdCount,
        updated: updatedCount,
        errors: errorCount
      },
      message: `${createdCount} création(s), ${updatedCount} mise(s) à jour, ${errorCount} erreur(s)`
    }, { status: errorCount === 0 ? 200 : 207 });
  } catch (error) {
    console.error('Attendance Bulk POST Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du traitement en masse des pointages' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/attendance/bulk - Get template or bulk status info
 */
export async function GET() {
  try {
    // Return template structure for bulk operations
    return NextResponse.json({
      success: true,
      data: {
        template: {
          records: [
            {
              employeeId: "string (required)",
              date: "YYYY-MM-DD (required)",
              clockIn: "ISO datetime (optional)",
              clockOut: "ISO datetime (optional)",
              breakDuration: "number in minutes (optional, default: 0)",
              status: "present|absent|late|leave|holiday (optional, default: present)",
              workedHours: "number (optional, auto-calculated if clockIn+clockOut provided)",
              notes: "string (optional)"
            }
          ]
        },
        maxRecordsPerRequest: 100,
        supportedActions: ["create", "update"],
        notes: "Les heures travaillées sont calculées automatiquement si clockIn et clockOut sont fournis"
      }
    });
  } catch (error) {
    console.error('Attendance Bulk GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des informations' },
      { status: 500 }
    );
  }
}
