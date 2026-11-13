import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { DemoProvider } from "@/components/demo-provider";
import { MobileTabs } from "@/components/mobile-tabs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StorageAlert } from "@/components/storage-alert";
import { PRODUCT_NAME, SCHOOL_NAME } from "@/lib/site";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `Unofficial hot lunch operations concept for ${SCHOOL_NAME}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background pb-24 text-foreground md:pb-0">
        <DemoProvider>
          <SiteHeader />
          <StorageAlert />
          <main
            id="main"
            className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-8 md:px-20 md:pt-12"
          >
            {children}
          </main>
          <SiteFooter />
          <MobileTabs />
        </DemoProvider>
      </body>
    </html>
  );
}
