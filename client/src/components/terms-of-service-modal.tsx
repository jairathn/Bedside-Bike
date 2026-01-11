import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, FileText, AlertTriangle, Database, Link, MessageSquare, Stethoscope } from "lucide-react";

// Current version of the Terms of Service
export const TOS_VERSION = "1.0.0";

interface TermsOfServiceModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  userType: "patient" | "provider";
}

// Patient-specific Terms of Service content
function PatientTermsContent() {
  return (
    <div className="space-y-6 text-sm text-gray-700">
      {/* Introduction */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Welcome to Bedside Bike
        </h3>
        <p className="leading-relaxed">
          By creating an account and using the Bedside Bike platform, you agree to the following terms and conditions.
          Please read them carefully before proceeding.
        </p>
      </section>

      {/* Website Disclaimer - Termly Language */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          WEBSITE DISCLAIMER
        </h3>
        <p className="leading-relaxed text-gray-700">
          The information provided by Bedside Bike ("we," "us," or "our") on http://www.bedsidebike.com (the "Site") is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site. UNDER NO CIRCUMSTANCE SHALL WE HAVE ANY LIABILITY TO YOU FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF THE SITE OR RELIANCE ON ANY INFORMATION PROVIDED ON THE SITE. YOUR USE OF THE SITE AND YOUR RELIANCE ON ANY INFORMATION ON THE SITE IS SOLELY AT YOUR OWN RISK.
        </p>
      </section>

      {/* External Links Disclaimer - Termly Language */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Link className="w-5 h-5 text-gray-600" />
          EXTERNAL LINKS DISCLAIMER
        </h3>
        <p className="leading-relaxed text-gray-700">
          The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties or links to websites and features in banners or other advertising. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us. WE DO NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR THE ACCURACY OR RELIABILITY OF ANY INFORMATION OFFERED BY THIRD-PARTY WEBSITES LINKED THROUGH THE SITE OR ANY WEBSITE OR FEATURE LINKED IN ANY BANNER OR OTHER ADVERTISING. WE WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES.
        </p>
      </section>

      {/* Professional Disclaimer - Termly Language */}
      <section className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h3 className="text-base font-semibold text-orange-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          PROFESSIONAL DISCLAIMER
        </h3>
        <p className="leading-relaxed text-orange-800">
          The Site cannot and does not contain medical/health advice. The medical/health information is provided for general informational and educational purposes only and is not a substitute for professional advice. Accordingly, before taking any actions based upon such information, we encourage you to consult with the appropriate professionals. We do not provide any kind of medical/health advice. THE USE OR RELIANCE OF ANY INFORMATION CONTAINED ON THE SITE IS SOLELY AT YOUR OWN RISK.
        </p>
      </section>

      {/* Testimonials Disclaimer - Termly Language */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          TESTIMONIALS DISCLAIMER
        </h3>
        <div className="space-y-3 text-gray-700">
          <p className="leading-relaxed">
            The Site may contain testimonials by users of our products and/or services. These testimonials reflect the real-life experiences and opinions of such users. However, the experiences are personal to those particular users, and may not necessarily be representative of all users of our products and/or services. We do not claim, and you should not assume, that all users will have the same experiences. YOUR INDIVIDUAL RESULTS MAY VARY.
          </p>
          <p className="leading-relaxed">
            The testimonials on the Site are submitted in various forms such as text, audio and/or video, and are reviewed by us before being posted. They appear on the Site verbatim as given by the users, except for the correction of grammar or typing errors. Some testimonials may have been shortened for the sake of brevity where the full testimonial contained extraneous information not relevant to the general public.
          </p>
          <p className="leading-relaxed">
            The views and opinions contained in the testimonials belong solely to the individual user and do not reflect our views and opinions. We are not affiliated with users who provide testimonials, and users are not paid or otherwise compensated for their testimonials.
          </p>
        </div>
      </section>

      {/* Health Data Disclaimer */}
      <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-base font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Database className="w-5 h-5" />
          HEALTH DATA COLLECTION & RETENTION
        </h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800">
          <li>We collect exercise session data including duration, power output, and performance metrics to personalize your therapy experience.</li>
          <li>Your health and exercise data is stored securely and retained for the duration of your care and as required by applicable healthcare regulations.</li>
          <li>Data may be anonymized and aggregated for research purposes to improve mobility outcomes for future patients.</li>
          <li>You may request a copy of your data or request deletion subject to regulatory retention requirements.</li>
        </ul>
      </section>

      {/* Privacy & Data Sharing */}
      <section className="bg-green-50 p-4 rounded-lg border border-green-200">
        <h3 className="text-base font-semibold text-green-900 mb-3">PRIVACY & DATA SHARING</h3>
        <ul className="list-disc list-inside space-y-2 text-green-800">
          <li>Your data may be shared with your healthcare providers to coordinate your care.</li>
          <li>We use industry-standard security measures to protect your information.</li>
          <li>We will never sell your personal health information to third parties.</li>
          <li>The Kudos Wall feature is opt-in; your achievements will only be shared if you choose to participate.</li>
        </ul>
      </section>

      {/* Agreement */}
      <section className="bg-gray-100 p-4 rounded-lg">
        <p className="font-medium text-gray-900">
          By clicking "I Accept," you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. You confirm that you are voluntarily choosing to use this platform as part of your care journey.
        </p>
      </section>
    </div>
  );
}

// Provider-specific Terms of Service content
function ProviderTermsContent() {
  return (
    <div className="space-y-6 text-sm text-gray-700">
      {/* Introduction */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-indigo-600" />
          Provider Terms of Service
        </h3>
        <p className="leading-relaxed">
          By creating a provider account on the Bedside Bike platform, you agree to the following terms governing your use of this clinical decision support tool.
        </p>
      </section>

      {/* Website Disclaimer - Termly Language */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          WEBSITE DISCLAIMER
        </h3>
        <p className="leading-relaxed text-gray-700">
          The information provided by Bedside Bike ("we," "us," or "our") on http://www.bedsidebike.com (the "Site") is for general informational purposes only. All information on the Site is provided in good faith, however we make no representation or warranty of any kind, express or implied, regarding the accuracy, adequacy, validity, reliability, availability, or completeness of any information on the Site. UNDER NO CIRCUMSTANCE SHALL WE HAVE ANY LIABILITY TO YOU FOR ANY LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF THE SITE OR RELIANCE ON ANY INFORMATION PROVIDED ON THE SITE. YOUR USE OF THE SITE AND YOUR RELIANCE ON ANY INFORMATION ON THE SITE IS SOLELY AT YOUR OWN RISK.
        </p>
      </section>

      {/* External Links Disclaimer - Termly Language */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Link className="w-5 h-5 text-gray-600" />
          EXTERNAL LINKS DISCLAIMER
        </h3>
        <p className="leading-relaxed text-gray-700">
          The Site may contain (or you may be sent through the Site) links to other websites or content belonging to or originating from third parties or links to websites and features in banners or other advertising. Such external links are not investigated, monitored, or checked for accuracy, adequacy, validity, reliability, availability, or completeness by us. WE DO NOT WARRANT, ENDORSE, GUARANTEE, OR ASSUME RESPONSIBILITY FOR THE ACCURACY OR RELIABILITY OF ANY INFORMATION OFFERED BY THIRD-PARTY WEBSITES LINKED THROUGH THE SITE OR ANY WEBSITE OR FEATURE LINKED IN ANY BANNER OR OTHER ADVERTISING. WE WILL NOT BE A PARTY TO OR IN ANY WAY BE RESPONSIBLE FOR MONITORING ANY TRANSACTION BETWEEN YOU AND THIRD-PARTY PROVIDERS OF PRODUCTS OR SERVICES.
        </p>
      </section>

      {/* Professional Disclaimer - Termly Language */}
      <section className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
        <h3 className="text-base font-semibold text-indigo-900 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          PROFESSIONAL DISCLAIMER
        </h3>
        <p className="leading-relaxed text-indigo-800 mb-3">
          The Site cannot and does not contain medical/health advice. The medical/health information is provided for general informational and educational purposes only and is not a substitute for professional advice. Accordingly, before taking any actions based upon such information, we encourage you to consult with the appropriate professionals. We do not provide any kind of medical/health advice. THE USE OR RELIANCE OF ANY INFORMATION CONTAINED ON THE SITE IS SOLELY AT YOUR OWN RISK.
        </p>
        <div className="border-t border-indigo-200 pt-3 mt-3">
          <p className="text-indigo-800 font-medium mb-2">Additional Provider Responsibilities:</p>
          <ul className="list-disc list-inside space-y-1 text-indigo-700">
            <li>This platform provides decision support tools and should supplement, not replace, your professional clinical judgment.</li>
            <li>AI-generated risk assessments and exercise recommendations should be independently verified before implementation.</li>
            <li>You remain professionally responsible for all clinical decisions made for patients under your care.</li>
            <li>By registering, you attest that your professional credentials are valid and current.</li>
          </ul>
        </div>
      </section>

      {/* Testimonials Disclaimer - Termly Language */}
      <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-600" />
          TESTIMONIALS DISCLAIMER
        </h3>
        <div className="space-y-3 text-gray-700">
          <p className="leading-relaxed">
            The Site may contain testimonials by users of our products and/or services. These testimonials reflect the real-life experiences and opinions of such users. However, the experiences are personal to those particular users, and may not necessarily be representative of all users of our products and/or services. We do not claim, and you should not assume, that all users will have the same experiences. YOUR INDIVIDUAL RESULTS MAY VARY.
          </p>
          <p className="leading-relaxed">
            The testimonials on the Site are submitted in various forms such as text, audio and/or video, and are reviewed by us before being posted. They appear on the Site verbatim as given by the users, except for the correction of grammar or typing errors. Some testimonials may have been shortened for the sake of brevity where the full testimonial contained extraneous information not relevant to the general public.
          </p>
          <p className="leading-relaxed">
            The views and opinions contained in the testimonials belong solely to the individual user and do not reflect our views and opinions. We are not affiliated with users who provide testimonials, and users are not paid or otherwise compensated for their testimonials.
          </p>
        </div>
      </section>

      {/* Patient Data Access */}
      <section className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-base font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <Database className="w-5 h-5" />
          PATIENT DATA ACCESS & HIPAA COMPLIANCE
        </h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800">
          <li>You agree to access patient data only for legitimate treatment, payment, or healthcare operations purposes.</li>
          <li>You will maintain the confidentiality of all patient information in accordance with HIPAA and applicable regulations.</li>
          <li>You will not share login credentials or allow unauthorized access to patient data.</li>
          <li>You will report any suspected data breaches or unauthorized access immediately.</li>
          <li>Patient data access is logged and audited for compliance purposes.</li>
        </ul>
      </section>

      {/* Limitation of Liability */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-gray-600" />
          LIMITATION OF LIABILITY
        </h3>
        <ul className="list-disc list-inside space-y-2">
          <li>The platform is provided "as is" without warranties of any kind.</li>
          <li>We are not liable for clinical decisions made based on information provided by the platform.</li>
          <li>We are not responsible for service interruptions, data loss, or technical issues.</li>
          <li>You agree to indemnify and hold harmless the platform operators from claims arising from your use.</li>
        </ul>
      </section>

      {/* Account Responsibilities */}
      <section className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <h3 className="text-base font-semibold text-orange-900 mb-3">ACCOUNT RESPONSIBILITIES</h3>
        <ul className="list-disc list-inside space-y-2 text-orange-800">
          <li>You are responsible for maintaining the security of your account credentials.</li>
          <li>You must log out when using shared computers or devices.</li>
          <li>Notify us immediately if you suspect unauthorized account access.</li>
          <li>Your account may be suspended for violations of these terms or suspicious activity.</li>
        </ul>
      </section>

      {/* Agreement */}
      <section className="bg-gray-100 p-4 rounded-lg">
        <p className="font-medium text-gray-900">
          By clicking "I Accept," you acknowledge that you are a licensed healthcare professional, have read and understood these Terms of Service, and agree to comply with all applicable laws and regulations regarding patient care and data privacy.
        </p>
      </section>
    </div>
  );
}

export function TermsOfServiceModal({ open, onAccept, onDecline, userType }: TermsOfServiceModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      setIsAccepted(false);
    }
  }, [open]);

  // Track scroll position
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const threshold = 50; // pixels from bottom
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + threshold;
    if (isAtBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6 text-blue-600" />
            Terms of Service
          </DialogTitle>
          <DialogDescription>
            {userType === "patient"
              ? "Please read and accept our Terms of Service to create your patient account."
              : "Please read and accept our Terms of Service to create your provider account."}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex-1 min-h-0 overflow-y-auto border rounded-lg p-4 bg-white"
          onScroll={handleScroll}
          ref={scrollRef}
        >
          {userType === "patient" ? <PatientTermsContent /> : <ProviderTermsContent />}
        </div>

        {!hasScrolledToBottom && (
          <p className="text-xs text-amber-600 text-center mt-2">
            Please scroll to the bottom to continue
          </p>
        )}

        <div className="flex items-start gap-3 mt-4 p-3 bg-gray-50 rounded-lg">
          <Checkbox
            id="accept-tos"
            checked={isAccepted}
            onCheckedChange={(checked) => setIsAccepted(checked === true)}
            disabled={!hasScrolledToBottom}
            className="mt-0.5"
          />
          <label
            htmlFor="accept-tos"
            className={`text-sm cursor-pointer ${!hasScrolledToBottom ? 'text-gray-400' : 'text-gray-700'}`}
          >
            I have read, understood, and agree to the Terms of Service. I understand that my continued use of this platform is subject to these terms.
            {userType === "provider" && (
              <span className="block mt-1 text-indigo-700 font-medium">
                I confirm that I am a licensed healthcare professional and will use this platform in accordance with applicable laws and regulations.
              </span>
            )}
          </label>
        </div>

        <DialogFooter className="mt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onDecline}
            className="flex-1 sm:flex-none"
          >
            Decline
          </Button>
          <Button
            onClick={onAccept}
            disabled={!isAccepted || !hasScrolledToBottom}
            className={`flex-1 sm:flex-none ${userType === "patient" ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"}`}
          >
            I Accept
          </Button>
        </DialogFooter>

        <p className="text-xs text-gray-500 text-center mt-2">
          Terms of Service Version {TOS_VERSION} | Last Updated: January 2026
        </p>
      </DialogContent>
    </Dialog>
  );
}
