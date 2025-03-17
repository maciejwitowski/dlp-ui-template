import {
  CheckCircle,
  Loader2,
  LockKeyhole,
  BlocksIcon,
  Server,
  Award,
  XCircle,
} from "lucide-react";

// Steps in the contribution process
export type Step = {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
};

export const contributionSteps: Step[] = [
  {
    id: 1,
    title: "Encrypt & Upload Data",
    description: "Encrypting and securely storing your data",
    icon: <LockKeyhole className="h-5 w-5" />,
  },
  {
    id: 2,
    title: "Register on Blockchain",
    description: "Recording encrypted data on the VANA network",
    icon: <BlocksIcon className="h-5 w-5" />,
  },
  {
    id: 3,
    title: "Request Validation",
    description: "Submitting job to validation nodes",
    icon: <Server className="h-5 w-5" />,
  },
  {
    id: 4,
    title: "Validate Contribution",
    description: "Running proof-of-contribution in trusted environment",
    icon: <Server className="h-5 w-5" />,
  },
  {
    id: 5,
    title: "Receive Attestation",
    description: "Recording validation proof on-chain",
    icon: <Award className="h-5 w-5" />,
  },
];

type ContributionStepsProps = {
  currentStep: number;
  completedSteps: number[];
  hasError?: boolean;
};

export function ContributionSteps({
  currentStep,
  completedSteps,
  hasError = false,
}: ContributionStepsProps) {
  // Helper function to determine the status of each step
  const getStepStatus = (stepId: number) => {
    if (completedSteps.includes(stepId)) return "complete";
    if (currentStep === stepId) return hasError ? "error" : "current";
    return "pending";
  };

  return (
    <div className="py-4">
      {contributionSteps.map((step, i) => {
        const status = getStepStatus(step.id);
        return (
          <div key={step.id} className="flex mb-4 last:mb-0">
            {/* Step indicator */}
            <div className="mr-4 flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full aspect-square ${
                  status === "complete"
                    ? "bg-green-100 text-green-600"
                    : status === "current"
                    ? "bg-blue-100 text-blue-600"
                    : status === "error"
                    ? "bg-red-100 text-red-600" 
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {status === "complete" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : status === "current" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : status === "error" ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              {/* Connector line (except for last item) */}
              {i < contributionSteps.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 my-1"></div>
              )}
            </div>
            {/* Step content */}
            <div className="flex-1">
              <h3 className="text-sm font-medium">{step.title}</h3>
              <p className="text-xs text-muted-foreground">
                {step.description}
              </p>
              {status === "current" && (
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {step.id === 1
                    ? "Encrypting and uploading data..."
                    : step.id === 2
                    ? "Registering on blockchain..."
                    : step.id === 3
                    ? "Requesting validation from Satya node..."
                    : step.id === 4
                    ? "Running proof-of-contribution..."
                    : "Recording proof on-chain..."}
                </p>
              )}
              {status === "error" && (
                <p className="text-xs text-red-600 mt-1 flex items-center">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
