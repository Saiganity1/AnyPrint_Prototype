/**
 * Checkout progress indicator component
 */

export default function CheckoutProgress({ currentStep = 1, totalSteps = 4 }) {
  const steps = ['Cart', 'Shipping', 'Payment', 'Confirmation'];

  return (
    <div className="checkout-progress">
      <div className="progress-steps">
        {steps.slice(0, totalSteps).map((step, index) => (
          <div
            key={index}
            className={`progress-step ${
              index + 1 < currentStep ? 'completed' : index + 1 === currentStep ? 'active' : 'pending'
            }`}
          >
            <div className="step-number">
              {index + 1 < currentStep ? '✓' : index + 1}
            </div>
            <div className="step-label">{step}</div>
          </div>
        ))}
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
}
