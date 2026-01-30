import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/middleware";
import { executeCommand } from "@/lib/system/executor";

// POST: 系统控制操作（重启面板、重启服务器等）
async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "restart_panel": {
        // 重启面板服务
        console.log("Restarting OpenNextPanel service...");

        // 异步执行重启，不等待结果（因为重启后连接会断开）
        setTimeout(async () => {
          try {
            await executeCommand("systemctl", ["restart", "opennextpanel"], {
              useSudo: true,
              timeout: 30000,
            });
          } catch (e) {
            console.error("Restart failed:", e);
          }
        }, 1000);

        return NextResponse.json({
          success: true,
          message: "面板正在重启，请稍后刷新页面",
        });
      }

      case "restart_server": {
        // 重启服务器
        console.log("Restarting server...");

        setTimeout(async () => {
          try {
            await executeCommand("reboot", [], {
              useSudo: true,
              timeout: 10000,
            });
          } catch (e) {
            console.error("Reboot failed:", e);
          }
        }, 2000);

        return NextResponse.json({
          success: true,
          message: "服务器正在重启",
        });
      }

      case "shutdown_server": {
        // 关闭服务器
        console.log("Shutting down server...");

        setTimeout(async () => {
          try {
            await executeCommand("shutdown", ["-h", "now"], {
              useSudo: true,
              timeout: 10000,
            });
          } catch (e) {
            console.error("Shutdown failed:", e);
          }
        }, 2000);

        return NextResponse.json({
          success: true,
          message: "服务器正在关机",
        });
      }

      default:
        return NextResponse.json(
          { error: "未知操作" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("System control error:", error);
    return NextResponse.json(
      { error: error.message || "操作失败" },
      { status: 500 }
    );
  }
}

export const POST = withAdmin(handlePOST);
