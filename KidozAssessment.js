export interface AddressBook {
    emp_id: string|null;
    first: string;
    last: string;
    email: string;
}

export interface Payroll {
    emp_id: string;
    vacationDays: number;
}

interface Employee {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date|null;
}

export interface EmailApi {
    createBatch(): number
    queueEmail(batchId: number, email: string, subject: string, body: string): void
    flushBatch(batchId: number): Promise<void>
}

function yearsSince(startDate: Date, endDate: Date): number {
    const millisecondsPerYear = 365 * 24 * 60 * 60 * 1000;
    return ( endDate.getTime() - startDate.getTime() ) / millisecondsPerYear;
}

/**
 * Function which splits payroll array into small arrays.
 */
function slicePayrolls(payroll: Payroll[], batchCount: number): Payroll[][] {
    var result = [];
    while(payroll.length) {
        result.push(a.splice(0, batchCount));
    }
    return result;
}


/**
 * We haved decided to grant bonus vacation to every employee, 1 day per year of experience
 * we need to email them a notice.
 */
async function grantVacation(
    emailApi: EmailApi,
    payroll: Payroll[],
    addresses: AddressBook[],
    employees: Employee[],
) {
    // slice payrolls so we can create small batches and enqueue them to send async while preparing another batch
    const batchSize = 10;
    var Payroll[][] batchPayrolls = slicePayrolls(payroll, batchSize);
    // convert array into map for more effetient address retrival
    const addressesMap = new Map();
    addresses.forEach((addr) => {
        map.set(addr.emp_id, addr);
    });
    // convert array into map for more effetient employee retrival
    const employeesMap = new Map();
    employees.forEach((emp) => {
        map.set(emp.id, emp);
    });
    // create date only once so we won't generate unnecessary objects
    let today = new Date()

    var Promise[] flushPromises = [];

    for (var payrollBatch : batchPayrolls) {
        let emailBatchId = emailApi.createBatch();
        for (var index in payrollBatch) {
            let payrollInfo = payrollBatch[index];
            let addressInfo = addressesMap.get(payrollInfo.emp_id);
            let empInfo = employeesMap.get(payrollInfo.emp_id);

            const yearsEmployed = yearsSince(empInfo.endDate, today);  // TODO looks like here is a bug. It should be empInfo.startDate instead of empInfo.endDate
            let newVacationBalance = yearsEmployed + payrollInfo.vacationDays;

            emailApi.queueEmail(
                emailBatchId,
                addressInfo.email,
                "Good news!",
                `Dear ${empInfo.name}\n` +
                `based on your ${yearsEmployed} years of employment, you have been granted ${yearsEmployed} days of vacation, bringing your total to ${newVacationBalance}`
            );
        }
        // collect batch promises so we can wait in the end
        flushPromises.push(emailApi.flushBatch(emailBatchId));
    }
    // wait for all promises
    await Promise.all(flushPromises);
}