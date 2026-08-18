import {
  useEffect,
  useState,
} from 'react';

import {
  getTravelerPaymentHistory,
} from '../api/paymentApi';

/*
 * ------------------------------------------------------------
 * FORMATTING HELPERS
 * ------------------------------------------------------------
 */

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '৳0';
  }

  return `৳${amount.toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date);
}

/*
 * ------------------------------------------------------------
 * PAYMENT STATUS VISUALS
 * ------------------------------------------------------------
 */

function getPaymentStatusStyle(
  status
) {
  switch (status) {
    case 'paid':
      return 'bg-[#DDF1E5] text-[#0F6B4D]';

    case 'failed':
      return 'bg-red-50 text-red-600';

    case 'cancelled':
      return 'bg-[#FFF4D6] text-[#8A6816]';

    case 'refunded':
      return 'bg-[#E4EEF9] text-[#315E8A]';

    case 'initiated':
    default:
      return 'bg-[#EEF0EF] text-[#66756D]';
  }
}

/*
 * Booking type is intentionally generic.
 *
 * Currently:
 *
 * hotel
 *
 * Future:
 *
 * guide
 */
function getBookingTypeLabel(
  bookingType
) {
  switch (bookingType) {
    case 'guide':
      return 'Guide Booking';

    case 'hotel':
    default:
      return 'Hotel Booking';
  }
}

function getBookingTypeStyle(
  bookingType
) {
  switch (bookingType) {
    case 'guide':
      return 'bg-[#E9F0F7] text-[#315E8A]';

    case 'hotel':
    default:
      return 'bg-[#EEF7F2] text-[#0F6B4D]';
  }
}

function TravelerPaymentsPage() {
  const [
    payments,
    setPayments,
  ] = useState([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    pageError,
    setPageError,
  ] = useState('');

  useEffect(() => {
    let ignoreResult = false;

    async function loadPayments() {
      setIsLoading(true);
      setPageError('');

      try {
        const result =
          await getTravelerPaymentHistory();

        if (ignoreResult) {
          return;
        }

        setPayments(
          result?.data?.payments ??
            []
        );
      } catch (error) {
        if (!ignoreResult) {
          setPageError(
            error.response?.data
              ?.message ||
              'Unable to load payment history.'
          );
        }
      } finally {
        if (!ignoreResult) {
          setIsLoading(false);
        }
      }
    }

    void loadPayments();

    return () => {
      ignoreResult = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-medium text-[#66756D]">
          Loading payment history...
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Page heading. */}
      <div>
        <h1 className="text-2xl font-bold text-[#17211D] md:text-3xl">
          Payment History
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#66756D]">
          View all of your Ghuraghuri
          payment attempts in one place,
          including hotel payments and
          future guide payments.
        </p>
      </div>

      {/* API error. */}
      {pageError && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      {/* ----------------------------------------------------
          PAYMENT SUMMARY
         ---------------------------------------------------- */}
      {payments.length > 0 && (
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
              Total Attempts
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {payments.length}
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
              Successful
            </p>

            <p className="mt-2 text-2xl font-bold text-[#0F6B4D]">
              {
                payments.filter(
                  (payment) =>
                    payment.status ===
                    'paid'
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE5E0] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9690]">
              Total Paid
            </p>

            <p className="mt-2 text-2xl font-bold text-[#17211D]">
              {formatMoney(
                payments
                  .filter(
                    (payment) =>
                      payment.status ===
                      'paid'
                  )
                  .reduce(
                    (
                      total,
                      payment
                    ) =>
                      total +
                      Number(
                        payment.amount ||
                          0
                      ),
                    0
                  )
              )}
            </p>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          PAYMENT LIST
         ---------------------------------------------------- */}
      <section className="pt-7">
        {payments.length === 0 ? (
          <div className="rounded-xl border border-[#DCE5E0] bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF7F2] text-xl font-bold text-[#0F6B4D]">
              ৳
            </div>

            <h2 className="mt-4 text-lg font-bold text-[#17211D]">
              No payments yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#66756D]">
              Your hotel and future guide
              payment attempts will appear
              here after you begin checkout.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#DCE5E0] bg-white shadow-sm">
            <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_150px] gap-4 border-b border-[#E5ECE8] bg-[#F8FBF9] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#8A9690] md:grid">
              <div>Payment</div>
              <div>Transaction</div>
              <div>Date</div>
              <div className="text-right">
                Amount
              </div>
            </div>

            <div className="divide-y divide-[#E5ECE8]">
              {payments.map(
                (payment) => (
                  <article
                    key={payment._id}
                    className="grid gap-4 px-5 py-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_150px] md:items-center"
                  >
                    {/* Payment type + status. */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={[
                            'rounded-full px-3 py-1 text-xs font-semibold',

                            getBookingTypeStyle(
                              payment.bookingType
                            ),
                          ].join(' ')}
                        >
                          {getBookingTypeLabel(
                            payment.bookingType
                          )}
                        </span>

                        <span
                          className={[
                            'rounded-full px-3 py-1 text-xs font-semibold capitalize',

                            getPaymentStatusStyle(
                              payment.status
                            ),
                          ].join(' ')}
                        >
                          {payment.status}
                        </span>
                      </div>

                      <p className="mt-3 text-xs text-[#66756D]">
                        Gateway
                      </p>

                      <p className="mt-1 text-sm font-semibold uppercase text-[#17211D]">
                        {payment.gateway ||
                          '—'}
                      </p>
                    </div>

                    {/* Transaction information. */}
                    <div className="min-w-0">
                      <p className="text-xs text-[#66756D] md:hidden">
                        Transaction
                      </p>

                      <p className="mt-1 break-all text-sm font-medium text-[#17211D] md:mt-0">
                        {
                          payment.transactionId
                        }
                      </p>

                      <p className="mt-2 break-all text-xs text-[#8A9690]">
                        Booking ID:{' '}
                        {
                          payment.bookingId
                        }
                      </p>
                    </div>

                    {/* Created/paid dates. */}
                    <div>
                      <p className="text-xs text-[#66756D] md:hidden">
                        Date
                      </p>

                      <p className="mt-1 text-sm font-medium text-[#17211D] md:mt-0">
                        {formatDateTime(
                          payment.createdAt
                        )}
                      </p>

                      {payment.paidAt && (
                        <p className="mt-2 text-xs text-[#0F6B4D]">
                          Paid:{' '}
                          {formatDateTime(
                            payment.paidAt
                          )}
                        </p>
                      )}
                    </div>

                    {/* Amount. */}
                    <div className="md:text-right">
                      <p className="text-xs text-[#66756D] md:hidden">
                        Amount
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#17211D] md:mt-0">
                        {formatMoney(
                          payment.amount
                        )}
                      </p>

                      <p className="mt-1 text-xs font-medium text-[#66756D]">
                        {payment.currency ||
                          'BDT'}
                      </p>
                    </div>
                  </article>
                )
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default TravelerPaymentsPage;