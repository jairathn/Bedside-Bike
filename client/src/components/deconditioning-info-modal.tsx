import { useState } from "react";
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeconditioningInfoModalProps {
  triggerClassName?: string;
  iconOnly?: boolean;
}

export function DeconditioningInfoModal({
  triggerClassName = "",
  iconOnly = true
}: DeconditioningInfoModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <button
            className={`inline-flex items-center justify-center hover:bg-gray-100 rounded-full p-0.5 transition-colors ${triggerClassName}`}
            aria-label="Learn about deconditioning"
          >
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        ) : (
          <Button variant="ghost" size="sm" className={triggerClassName}>
            <Info className="w-4 h-4 mr-1" />
            What is this?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">📉</span>
            Hospital-Acquired Deconditioning
          </DialogTitle>
          <DialogDescription className="text-left">
            Also known as Hospital-Acquired Functional Decline (HAFD)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Definition</h4>
            <p className="text-gray-700">
              Measurable loss of physical function during hospitalization,
              resulting from prolonged bedrest and reduced mobility.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Characterized By</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Decline in muscle strength (&gt;10% loss of grip or leg strength)</li>
              <li>Reduced mobility (walking distance, gait speed, or transfers)</li>
              <li>Loss of ability to perform daily activities independently</li>
              <li>Decreased aerobic/exercise capacity</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">How It's Measured</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              <li>Barthel Index decline ≥5 points from admission</li>
              <li>6-minute walk test decline &gt;50 meters</li>
              <li>Grip strength decline &gt;10%</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Risk Factors</h4>
            <div className="flex flex-wrap gap-2">
              {[
                "Prolonged bedrest",
                "Age >65",
                "Cognitive impairment",
                "Malnutrition",
                "Critical illness",
                "Polypharmacy",
                "Pre-existing frailty"
              ].map((factor) => (
                <span
                  key={factor}
                  className="px-2 py-1 bg-amber-50 text-amber-800 rounded text-xs"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-1">Why It Matters</h4>
            <p className="text-blue-800 text-xs">
              30-60% of hospitalized elderly experience some functional decline.
              Early mobility interventions can significantly reduce this risk
              and improve outcomes including length of stay and discharge disposition.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DeconditioningInfoModal;
