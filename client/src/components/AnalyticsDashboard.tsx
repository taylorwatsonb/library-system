import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";

type BookStats = {
  title: string;
  checkouts: number;
  reservations: number;
};

type FineStats = {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  monthlyStats: {
    month: string;
    amount: number;
  }[];
};

type ActivityStats = {
  dailyActivity: {
    date: string;
    checkouts: number;
    returns: number;
    reservations: number;
  }[];
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function AnalyticsDashboard() {
  const { data: bookStats, isLoading: isLoadingBooks } = useQuery<BookStats[]>({
    queryKey: ['/api/analytics/books'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/books', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch book statistics');
      }
      return response.json();
    },
  });

  const { data: fineStats, isLoading: isLoadingFines } = useQuery<FineStats>({
    queryKey: ['/api/analytics/fines'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/fines', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch fine statistics');
      }
      return response.json();
    },
  });

  const { data: activityStats, isLoading: isLoadingActivity } = useQuery<ActivityStats>({
    queryKey: ['/api/analytics/activity'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/activity', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch activity statistics');
      }
      return response.json();
    },
  });

  if (isLoadingBooks || isLoadingFines || isLoadingActivity) {
    return <div>Loading analytics...</div>;
  }

  const pieData = [
    { name: 'Paid', value: fineStats?.paidAmount || 0 },
    { name: 'Pending', value: fineStats?.pendingAmount || 0 },
  ];

  return (
    <div className="space-y-8">
      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Book Statistics</TabsTrigger>
          <TabsTrigger value="fines">Fine Overview</TabsTrigger>
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
        </TabsList>
        
        <TabsContent value="books">
          <Card>
            <CardHeader>
              <CardTitle>Most Active Books</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bookStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="checkouts" fill="#0088FE" name="Checkouts" />
                    <Bar dataKey="reservations" fill="#00C49F" name="Reservations" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fines">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Fine Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Fine Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fineStats?.monthlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#8884d8" name="Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Daily Library Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activityStats?.dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'PP')}
                    />
                    <Bar dataKey="checkouts" fill="#0088FE" name="Checkouts" />
                    <Bar dataKey="returns" fill="#00C49F" name="Returns" />
                    <Bar dataKey="reservations" fill="#FFBB28" name="Reservations" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
