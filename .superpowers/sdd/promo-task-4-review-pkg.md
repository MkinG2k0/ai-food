# Review package Task 4
BASE: 3e442d969aba938322717daadae60e67d84b0014
HEAD: e1c6a34 (promo UI only; ignore later legal-pages commit)

## Commits


## Stat
 .../src/pages/subscribe/ui/SubscribePage.tsx       | 117 +++++++++++++++++----
 1 file changed, 99 insertions(+), 18 deletions(-)


## Diff
diff --git a/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx b/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
index 1f429c5..19ebfff 100644
--- a/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
+++ b/apps/ai-food/src/pages/subscribe/ui/SubscribePage.tsx
@@ -1,37 +1,46 @@
 import { useCallback, useEffect, useState } from 'react';
 import { useNavigate, useSearchParams } from 'react-router-dom';
 import { toast } from 'sonner';
 import {
   fetchBillingStatus,
   subscribe,
   syncBilling,
   useSubscriptionPrice,
+  validatePromo,
 } from '@/features/billing';
 import { useAuthStore } from '@/features/auth';
 import { Button, SubpageShell } from '@/shared/ui';
 
 function openPaymentUrl(url: string): void {
   window.location.assign(url);
 }
 
 export function SubscribePage() {
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const variant = searchParams.get('result'); // success | fail via query, or path
   const pathname =
     typeof window !== 'undefined' ? window.location.pathname : '';
   const isSuccess =
     pathname.endsWith('/subscribe/success') || variant === 'success';
   const isFail = pathname.endsWith('/subscribe/fail') || variant === 'fail';
   const userToken = useAuthStore((s) => s.userToken);
   const [paying, setPaying] = useState(false);
+  const [promoInput, setPromoInput] = useState('');
+  const [applying, setApplying] = useState(false);
+  const [applied, setApplied] = useState<{
+    code: string;
+    discountPercent: number;
+    originalAmount: number;
+    finalAmount: number;
+  } | null>(null);
   const [pollStatus, setPollStatus] = useState<
     'idle' | 'polling' | 'active' | 'timeout'
   >('idle');
 
   const paymentId = searchParams.get('paymentId') ?? undefined;
   const isMock = searchParams.get('mock') === '1';
   const { data: price, isLoading: priceLoading, isError: priceError } =
     useSubscriptionPrice();
   const priceRub =
     price != null ? Math.round(price.amountKopecks / 100) : null;
@@ -57,28 +66,63 @@ export function SubscribePage() {
       await new Promise((r) => setTimeout(r, 2000));
     }
     setPollStatus('timeout');
   }, [isMock, paymentId]);
 
   useEffect(() => {
     if (!isSuccess || !userToken) return;
     void pollUntilActive();
   }, [isSuccess, userToken, pollUntilActive]);
 
+  function clearAppliedIfEdited(next: string) {
+    setPromoInput(next);
+    if (applied && next.trim().toLowerCase() !== applied.code) {
+      setApplied(null);
+    }
+  }
+
+  async function handleApplyPromo() {
+    if (!userToken) {
+      navigate('/login', { replace: true, state: { from: '/subscribe' } });
+      return;
+    }
+    setApplying(true);
+    try {
+      const result = await validatePromo(promoInput);
+      setApplied({
+        code: result.code,
+        discountPercent: result.discountPercent,
+        originalAmount: result.originalAmount,
+        finalAmount: result.finalAmount,
+      });
+      setPromoInput(result.code);
+      toast.success(`╨б╨║╨╕╨┤╨║╨░ ${result.discountPercent}% ╨┐╤А╨╕╨╝╨╡╨╜╨╡╨╜╨░`);
+    } catch (err) {
+      setApplied(null);
+      const message =
+        err && typeof err === 'object' && 'message' in err
+          ? String((err as { message: string }).message)
+          : '╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ ╨┐╤А╨╛╨╝╨╛╨║╨╛╨┤';
+      toast.error(message);
+    } finally {
+      setApplying(false);
+    }
+  }
+
   async function handlePay() {
     if (!userToken) {
       navigate('/login', { replace: true, state: { from: '/subscribe' } });
       return;
     }
     setPaying(true);
     try {
-      const result = await subscribe();
+      const result = await subscribe(applied?.code);
       openPaymentUrl(result.paymentUrl);
     } catch (err) {
       const message =
         err && typeof err === 'object' && 'message' in err
           ? String((err as { message: string }).message)
           : '╨Э╨╡ ╤Г╨┤╨░╨╗╨╛╤Б╤М ╤Б╨╛╨╖╨┤╨░╤В╤М ╨┐╨╗╨░╤В╤С╨╢';
       toast.error(message);
       setPaying(false);
     }
   }
@@ -149,40 +193,53 @@ export function SubscribePage() {
     );
   }
 
   return (
     <SubpageShell
       title="╨Я╨╛╨┤╨┐╨╕╤Б╨║╨░"
       onBack={() => navigate(-1)}
       mainClassName="space-y-6"
     >
       <section className="space-y-3">
-        <p className="text-3xl font-semibold tabular-nums">
-          {priceLoading && (
-            <span className="text-base font-normal text-muted-foreground">
-              ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╤Ж╨╡╨╜╤ЛтАж
+        {applied ? (
+          <p className="text-3xl font-semibold tabular-nums">
+            <span className="mr-2 text-base font-normal text-muted-foreground line-through">
+              {(applied.originalAmount / 100).toLocaleString('ru-RU')} тВ╜
             </span>
-          )}
-          {priceError && (
-            <span className="text-base font-normal text-muted-foreground">
-              ╨ж╨╡╨╜╨░ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨░
+            {(applied.finalAmount / 100).toLocaleString('ru-RU')} тВ╜
+            <span className="ml-2 text-base font-normal text-muted-foreground">
+              / {durationDays != null ? `${durationDays} ╨┤╨╜.` : '╤Б╤А╨╛╨║'} (тИТ
+              {applied.discountPercent}%)
             </span>
-          )}
-          {priceRub != null && (
-            <>
-              {priceRub.toLocaleString('ru-RU')} тВ╜
-              <span className="ml-2 text-base font-normal text-muted-foreground">
-                / {durationDays != null ? `${durationDays} ╨┤╨╜.` : '╤Б╤А╨╛╨║'}
+          </p>
+        ) : (
+          <p className="text-3xl font-semibold tabular-nums">
+            {priceLoading && (
+              <span className="text-base font-normal text-muted-foreground">
+                ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╤Ж╨╡╨╜╤ЛтАж
               </span>
-            </>
-          )}
-        </p>
+            )}
+            {priceError && (
+              <span className="text-base font-normal text-muted-foreground">
+                ╨ж╨╡╨╜╨░ ╨╜╨╡╨┤╨╛╤Б╤В╤Г╨┐╨╜╨░
+              </span>
+            )}
+            {priceRub != null && (
+              <>
+                {priceRub.toLocaleString('ru-RU')} тВ╜
+                <span className="ml-2 text-base font-normal text-muted-foreground">
+                  / {durationDays != null ? `${durationDays} ╨┤╨╜.` : '╤Б╤А╨╛╨║'}
+                </span>
+              </>
+            )}
+          </p>
+        )}
         <p className="text-sm text-muted-foreground">
           ╨а╨░╨╖╨╛╨▓╨░╤П ╨╛╨┐╨╗╨░╤В╨░ тАФ ╨┤╨╛╤Б╤В╤Г╨┐ ╨║ AI ╨╜╨░{' '}
           {durationDays != null ? `${durationDays} ╨┤╨╜╨╡╨╣` : '╤Б╤А╨╛╨║ ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╨╕'}.
           ╨С╨╡╨╖ ╨░╨▓╤В╨╛╤Б╨┐╨╕╤Б╨░╨╜╨╕╨╣.
         </p>
       </section>
 
       <section className="space-y-2">
         <h2 className="text-sm font-medium">╨Т╤Е╨╛╨┤╨╕╤В ╨▓ ╨╗╨╕╤Ж╨╡╨╜╨╖╨╕╤О</h2>
         <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
@@ -193,20 +250,44 @@ export function SubscribePage() {
 
       <section className="space-y-2">
         <h2 className="text-sm font-medium">╨Т╤Б╨╡╨│╨┤╨░ ╨▒╨╡╤Б╨┐╨╗╨░╤В╨╜╨╛</h2>
         <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
           <li>╨Ф╨╜╨╡╨▓╨╜╨╕╨║ ╨┐╤А╨╕╤С╨╝╨╛╨▓ ╨┐╨╕╤Й╨╕</li>
           <li>╨а╤Г╤З╨╜╨╛╨╣ ╨▓╨▓╨╛╨┤ ╨╕ ╤И╤В╤А╨╕╤Е╨║╨╛╨┤</li>
           <li>╨б╤В╨░╤В╨╕╤Б╤В╨╕╨║╨░, ╨╜╨░╤Б╤В╤А╨╛╨╣╨║╨╕, ╨╛╨╜╨▒╨╛╤А╨┤╨╕╨╜╨│</li>
         </ul>
       </section>
 
+      <section className="space-y-2">
+        <label htmlFor="promo" className="text-sm font-medium">
+          ╨Я╤А╨╛╨╝╨╛╨║╨╛╨┤
+        </label>
+        <div className="flex gap-2">
+          <input
+            id="promo"
+            value={promoInput}
+            onChange={(e) => clearAppliedIfEdited(e.target.value)}
+            placeholder="╨Т╨▓╨╡╨┤╨╕╤В╨╡ ╨║╨╛╨┤"
+            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
+            autoComplete="off"
+          />
+          <Button
+            type="button"
+            variant="secondary"
+            disabled={applying || !promoInput.trim()}
+            onClick={() => void handleApplyPromo()}
+          >
+            {applying ? 'тАж' : '╨Я╤А╨╕╨╝╨╡╨╜╨╕╤В╤М'}
+          </Button>
+        </div>
+      </section>
+
       <Button
         className="w-full"
         disabled={paying}
         onClick={() => void handlePay()}
       >
         {paying ? '╨б╨╛╨╖╨┤╨░╤С╨╝ ╨┐╨╗╨░╤В╤С╨╢тАж' : '╨Ю╨┐╨╗╨░╤В╨╕╤В╤М'}
       </Button>
 
       {!userToken && (
         <p className="text-center text-xs text-muted-foreground">

