import axios, { AxiosResponse } from "axios";
import FormData from "form-data";

const BASE_URL = "https://my.flowsavvy.app/api/";

export interface FlowSavvyCredentials {
  email: string;
  password: string;
  timezone: string;
}

export interface FlowSavvyClientOptions extends FlowSavvyCredentials {}

export class FlowSavvyClient {
  private cookie: string[] = [];
  private csrfToken: string = "";
  private credentials: FlowSavvyCredentials;

  constructor(options: FlowSavvyClientOptions) {
    this.credentials = options;
  }

  async refreshAntiForgeryToken() {
    const response = await axios.get(BASE_URL + "Schedule/AntiForgeryToken", {
      headers: { Cookie: this.cookie }
    });
    const cookies = response.headers["set-cookie"];
    const tokenHtml = response.data as string;
    const match = /<input name="__RequestVerificationToken" type="hidden" value="([^"]+)" \/>/.exec(tokenHtml);
    const requestVerificationToken = match ? match[1] : "";
    if (this.cookie.length === 0) {
      this.cookie = cookies || [];
    } else if (cookies) {
      this.cookie = this.cookie.map(cookie => cookies.find(c => c.includes(".AspNetCore.Antiforgery.")) || cookie);
    }
    this.csrfToken = requestVerificationToken;
  }

  async login() {
    await this.refreshAntiForgeryToken();
    const formData = new FormData();
    formData.append("Email", this.credentials.email);
    formData.append("Password", this.credentials.password);
    formData.append("TimeZone", this.credentials.timezone);

    const config = {
      headers: {
        ...formData.getHeaders(),
        "x-csrf-token": this.csrfToken,
        Cookie: this.cookie
      }
    };

    const response = await axios.post(BASE_URL + "Account/Login", formData, config);
    if (response.data.success !== true || !response.headers["set-cookie"]) {
      throw new Error("Login failed. Check credentials.");
    }
    this.cookie.push(response.headers["set-cookie"][2]);
  }

  async request(
    method: "GET" | "POST",
    endpoint: string,
    data: any = {},
    withToken: boolean = false,
    headers?: any,
    donotretry: boolean = false
  ): Promise<AxiosResponse> {
    if (withToken) {
      await this.refreshAntiForgeryToken();
    }
    const response = await axios({
      method,
      url: BASE_URL + endpoint,
      data,
      headers: {
        Cookie: this.cookie,
        "x-csrf-token": this.csrfToken,
        ...headers
      }
    });
    if (!donotretry && response.status === 302) {
      await this.login();
      return this.request(method, endpoint, data, withToken, headers, true);
    }
    return response;
  }

  async searchTask(query: string) {
    const res = await this.request(
      "GET",
      `item/search?query=${query}&searchCompletedTasks=false&getItemsAfterCursor=true&takeFirst=true&batchSize=50`
    );
    const tasks = res.data?.searchResponse?.items ?? [];
    if (!tasks.length) return undefined;
    return tasks[0];
  }

  async createOrEditTask(task: Record<string, any>, edit: boolean = false) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(task)) {
      if (value != null) formData.append(key, value.toString());
    }
    const endpoint = edit ? "Item/Edit" : "Item/Create";
    return this.request("POST", endpoint, formData, true, formData.getHeaders());
  }

  async markTaskComplete(taskId: string) {
    const formData = new FormData();
    formData.append("serializedItemIdToInstanceIdsDict", `{"${taskId}":[0]}`);
    return this.request("POST", "Item/ChangeTaskCompleteStatus", formData, true, formData.getHeaders());
  }

  async deleteTask(taskId: string) {
    const formData = new FormData();
    formData.append("serializedItemIdToInstanceIdsDict", `{"${taskId}":[0]}`);
    formData.append("deleteType", "deleteAll");
    return this.request("POST", "Item/MultipleDelete", formData, true, formData.getHeaders());
  }

  async forceRecalculate() {
    const formData = new FormData();
    formData.append("force", "true");
    return this.request("POST", "Schedule/Recalculate", formData, true, formData.getHeaders());
  }
}